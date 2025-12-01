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

    console.log('Processing video job:', jobId);

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
    const model = metadata.model || 'stable-video-diffusion';

    console.log('Generating video with Replicate...', { model, jobType: job.job_type });

    // Map model to Replicate model ID
    const modelMap: Record<string, string> = {
      'stable-video-diffusion': 'stability-ai/stable-video-diffusion-img2vid-xt',
      'zeroscope-v2': 'anotherjesse/zeroscope-v2-xl',
    };

    const replicateModel = modelMap[model] || modelMap['stable-video-diffusion'];

    // Prepare input for Replicate
    let input: any = {};

    if (job.job_type === 'text_to_video') {
      // For text-to-video with zeroscope
      if (model === 'zeroscope-v2') {
        input = {
          prompt: job.prompt,
          num_frames: 24,
          fps: 8,
        };
      } else {
        // Stable Video Diffusion needs an image input
        // We'll first generate an image from the text, then convert to video
        console.log('Text-to-video: First generating image from prompt...');
        
        const imageOutput = await replicate.run('black-forest-labs/flux-schnell', {
          input: {
            prompt: job.prompt,
            num_outputs: 1,
          }
        }) as any;

        const imageUrl = Array.isArray(imageOutput) ? imageOutput[0] : imageOutput;
        
        input = {
          video: imageUrl,
          sizing_strategy: 'maintain_aspect_ratio',
          frames_per_second: 6,
          motion_bucket_id: 127,
        };
      }
    } else if (job.job_type === 'image_to_video') {
      // Image-to-video
      if (!job.input_image_url) {
        throw new Error('Input image URL is required for image-to-video');
      }

      console.log('Using image-to-video mode with input:', job.input_image_url);
      
      if (model === 'zeroscope-v2') {
        // Zeroscope doesn't support image-to-video, fall back to SVD
        input = {
          video: job.input_image_url,
          sizing_strategy: 'maintain_aspect_ratio',
          frames_per_second: 6,
          motion_bucket_id: 127,
        };
      } else {
        input = {
          video: job.input_image_url,
          sizing_strategy: 'maintain_aspect_ratio',
          frames_per_second: 6,
          motion_bucket_id: 127,
        };
      }
    }

    console.log('Running Replicate with input:', input);

    // Generate video using Replicate
    const output = await replicate.run(replicateModel, { input }) as any;

    console.log('Replicate video output:', output);

    // Handle output (can be array or single URL)
    let videoUrl: string;
    if (Array.isArray(output)) {
      videoUrl = output[0];
    } else if (typeof output === 'string') {
      videoUrl = output;
    } else if (output?.url) {
      videoUrl = output.url;
    } else {
      throw new Error('Unexpected output format from Replicate');
    }

    console.log('Video generated, downloading from:', videoUrl);

    // Download the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download generated video');
    }

    const videoBlob = await videoResponse.blob();

    // Upload the video to storage
    const fileName = `${job.user_id}/${jobId}_${Date.now()}.mp4`;
    const arrayBuffer = await videoBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, uint8Array, {
        contentType: 'video/mp4',
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

    console.log('Video uploaded to storage:', finalUrl);

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
        generation_type: 'video',
        prompt: job.prompt,
        result_url: finalUrl,
        provider: 'replicate',
        metadata: { 
          model: replicateModel,
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

    console.log('Video job completed successfully');

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
