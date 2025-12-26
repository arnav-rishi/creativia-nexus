import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const API_VERSION = '2024-11-06';

// Poll task status until complete
async function pollTaskStatus(taskId: string, apiKey: string, maxAttempts = 120): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': API_VERSION,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check task status: ${response.status} ${errorText}`);
    }

    const task = await response.json();
    console.log(`Task ${taskId} status: ${task.status}`);

    if (task.status === 'SUCCEEDED') {
      return task;
    } else if (task.status === 'FAILED') {
      throw new Error(task.failure || 'Image generation failed');
    }

    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  throw new Error('Image generation timeout');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | undefined;
  let creditsDeducted = false;
  let supabase: any;
  let job: any;
  
  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const runwayApiKey = Deno.env.get('RUNWAYML_API_SECRET');
    
    if (!runwayApiKey) {
      throw new Error('RUNWAYML_API_SECRET is not configured');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    console.log('Processing image job:', jobId, 'for user:', user.id);

    // Fetch job details
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      throw new Error('Job not found');
    }
    
    job = jobData;

    // Verify job ownership
    if (job.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - You do not have access to this job' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate prompt
    if (!job.prompt || job.prompt.length > 1000) {
      throw new Error('Invalid prompt: must be 1-1000 characters');
    }

    // ATOMIC CREDIT DEDUCTION - Deduct credits at the START
    const { data: deductResult, error: deductError } = await supabase
      .rpc('deduct_credits', { 
        p_user_id: job.user_id, 
        p_amount: job.cost_credits 
      });

    if (deductError) {
      console.error('Credit deduction error:', deductError);
      throw new Error('Failed to process credits');
    }

    if (!deductResult) {
      throw new Error('Insufficient credits');
    }

    creditsDeducted = true;
    console.log('Credits deducted successfully:', job.cost_credits);

    // Record credit transaction
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: job.user_id,
        amount: -job.cost_credits,
        type: 'spend',
        description: `Generated ${job.job_type}`,
      });

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const metadata = job.metadata || {};
    const model = metadata.model || 'gen4_image';
    const aspectRatio = metadata.aspect_ratio || '16:9';

    console.log('Generating image with RunwayML...', { model, aspectRatio, jobType: job.job_type });

    // Map aspect ratio to Runway format
    // Accepted: "1024:1024", "1080:1080", "1168:880", "1360:768", "1440:1080", "1080:1440", 
    //           "1808:768", "1920:1080", "1080:1920", "2112:912", "1280:720", "720:1280", 
    //           "720:720", "960:720", "720:960", "1680:720"
    const ratioMap: Record<string, string> = {
      '1:1': '1024:1024',
      '16:9': '1920:1080',
      '9:16': '1080:1920',
      '4:3': '1440:1080',
      '3:4': '1080:1440',
    };
    const runwayRatio = ratioMap[aspectRatio] || '1920:1080';

    // Prepare request payload for RunwayML text_to_image
    const requestPayload: any = {
      model: model, // gen4_image, gen4_image_turbo, gemini_2.5_flash
      promptText: job.prompt,
      ratio: runwayRatio,
    };

    // Handle image-to-image mode with reference images
    if (job.job_type === 'image_to_image' && job.input_image_url) {
      console.log('Using image reference mode with input:', job.input_image_url);
      requestPayload.referenceImages = [
        { uri: job.input_image_url, tag: 'reference' }
      ];
    }

    console.log('RunwayML request payload:', JSON.stringify(requestPayload));

    // Create image generation task
    const createResponse = await fetch(`${RUNWAY_API_BASE}/text_to_image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'X-Runway-Version': API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestPayload),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('RunwayML API error:', createResponse.status, errorText);
      
      if (createResponse.status === 402) {
        throw new Error('Insufficient RunwayML credits. Please add credits to your RunwayML account.');
      }
      if (createResponse.status === 429) {
        throw new Error('RunwayML rate limit exceeded. Please try again later.');
      }
      
      throw new Error(`RunwayML API error: ${createResponse.status} ${errorText}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.id;
    console.log('RunwayML task created:', taskId);

    // Poll for completion
    const completedTask = await pollTaskStatus(taskId, runwayApiKey);
    
    // Get the output URL
    let imageUrl: string;
    if (completedTask.output && completedTask.output.length > 0) {
      imageUrl = completedTask.output[0];
    } else if (completedTask.artifacts && completedTask.artifacts.length > 0) {
      imageUrl = completedTask.artifacts[0].url || completedTask.artifacts[0].uri;
    } else {
      throw new Error('No output from RunwayML');
    }

    console.log('Image generated, downloading from:', imageUrl);

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image');
    }

    const imageBlob = await imageResponse.blob();

    // Upload the image to storage
    const fileName = `${job.user_id}/${jobId}_${Date.now()}.png`;
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, uint8Array, {
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Create a signed URL (valid for 1 year)
    const { data: signedData } = await supabase.storage
      .from('generations')
      .createSignedUrl(fileName, 31536000);

    const finalUrl = signedData?.signedUrl;

    if (!finalUrl) {
      throw new Error('Failed to create signed URL');
    }

    console.log('Image uploaded to storage:', finalUrl);

    // Update job with result
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_url: finalUrl,
      })
      .eq('id', jobId);

    // Create generation record
    await supabase
      .from('generations')
      .insert({
        user_id: job.user_id,
        job_id: jobId,
        generation_type: 'image',
        prompt: job.prompt,
        result_url: finalUrl,
        provider: 'runwayml',
        metadata: { 
          model: model,
          aspect_ratio: aspectRatio,
        },
      });

    console.log('Image job completed successfully');

    return new Response(
      JSON.stringify({ success: true, resultUrl: finalUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    
    // Refund credits if they were deducted but the job failed
    if (creditsDeducted && supabase && job) {
      try {
        console.log('Refunding credits due to job failure:', job.cost_credits);
        
        // Refund by calling with negative amount
        await supabase.rpc('deduct_credits', { 
          p_user_id: job.user_id, 
          p_amount: -job.cost_credits
        });

        await supabase
          .from('credit_transactions')
          .insert({
            user_id: job.user_id,
            amount: job.cost_credits,
            type: 'refund',
            description: `Refund for failed ${job.job_type}`,
          });
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError);
      }
    }
    
    // Update job status to failed
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const client = supabase || createClient(supabaseUrl, supabaseKey);
        
        await client
          .from('jobs')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', jobId);
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
