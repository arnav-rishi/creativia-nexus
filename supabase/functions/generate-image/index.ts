import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    
    if (!replicateApiKey) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    const replicate = new Replicate({ auth: replicateApiKey });

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
    const model = metadata.model || 'flux-schnell';
    const aspectRatio = metadata.aspect_ratio || '1:1';
    const seed = metadata.seed;

    console.log('Generating image with Replicate...', { model, aspectRatio, jobType: job.job_type });

    // Map model to Replicate model ID
    const modelMap: Record<string, string> = {
      'flux-schnell': 'black-forest-labs/flux-schnell',
      'flux-dev': 'black-forest-labs/flux-dev',
      'flux-pro': 'black-forest-labs/flux-1.1-pro',
      'stable-diffusion-xl': 'stability-ai/sdxl',
    };

    const replicateModel = modelMap[model] || modelMap['flux-schnell'];

    // Prepare input for Replicate
    const input: any = {
      prompt: job.prompt,
      aspect_ratio: aspectRatio,
      num_outputs: 1,
      output_format: 'png',
      output_quality: 90,
    };

    // Add seed if provided
    if (seed) {
      input.seed = parseInt(seed);
    }

    // Handle image-to-image mode
    if (job.job_type === 'image_to_image' && job.input_image_url) {
      console.log('Using image-to-image mode with input:', job.input_image_url);
      input.image = job.input_image_url;
      input.prompt_strength = 0.8; // How much to transform the input image
    }

    // Generate image using Replicate
    let output: any;
    try {
      output = await replicate.run(replicateModel, { input }) as any;
    } catch (replicateError: any) {
      // Handle Replicate-specific errors
      if (replicateError.message?.includes('402') || replicateError.message?.includes('Insufficient credit')) {
        throw new Error('Insufficient Replicate credits. Please add credits to your Replicate account at https://replicate.com/account/billing');
      }
      if (replicateError.message?.includes('429') || replicateError.message?.includes('Too Many Requests') || replicateError.message?.includes('throttled')) {
        throw new Error('Replicate rate limit exceeded. Please add more credits to your Replicate account to increase your rate limit at https://replicate.com/account/billing');
      }
      throw replicateError;
    }

    console.log('Replicate output:', output);

    // Handle output (can be array or single URL)
    let imageUrl: string;
    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (output?.url) {
      imageUrl = output.url;
    } else {
      throw new Error('Unexpected output format from Replicate');
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
        provider: 'replicate',
        metadata: { 
          model: replicateModel,
          aspect_ratio: aspectRatio,
          seed: seed || null,
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
        await supabase
          .from('credits')
          .update({
            balance: supabase.sql`balance + ${job.cost_credits}`,
          })
          .eq('user_id', job.user_id);
        
        // Use raw SQL for atomic increment
        await supabase.rpc('deduct_credits', { 
          p_user_id: job.user_id, 
          p_amount: -job.cost_credits // Negative to refund
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