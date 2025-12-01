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
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    
    if (!replicateApiKey) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const replicate = new Replicate({ auth: replicateApiKey });

    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    console.log('Processing image job:', jobId);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Validate prompt
    if (!job.prompt || job.prompt.length > 1000) {
      throw new Error('Invalid prompt: must be 1-1000 characters');
    }

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
    const output = await replicate.run(replicateModel, { input }) as any;

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

    // Deduct credits
    const { data: credits } = await supabase
      .from('credits')
      .select('balance, total_spent')
      .eq('user_id', job.user_id)
      .single();

    if (credits) {
      await supabase
        .from('credits')
        .update({
          balance: credits.balance - job.cost_credits,
          total_spent: credits.total_spent + job.cost_credits,
        })
        .eq('user_id', job.user_id);

      await supabase
        .from('credit_transactions')
        .insert({
          user_id: job.user_id,
          amount: -job.cost_credits,
          type: 'spend',
          description: `Generated ${job.job_type}`,
        });
    }

    console.log('Image job completed successfully');

    return new Response(
      JSON.stringify({ success: true, resultUrl: finalUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    
    // Update job status to failed
    if (jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
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
