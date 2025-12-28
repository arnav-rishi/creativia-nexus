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
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    supabase = createClient(supabaseUrl, supabaseKey);
    let replicate;
    
    if (replicateApiKey) {
      replicate = new Replicate({ auth: replicateApiKey });
    }

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

    console.log('Processing video job:', jobId, 'for user:', user.id);

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
    const model = metadata.model || 'stable-video-diffusion';
    const duration = metadata.duration || 8; // Default to 8 seconds
    const provider = model.startsWith('sora-') ? 'openai' : 'replicate';

    console.log('Generating video...', { model, jobType: job.job_type, provider });

    // Handle OpenAI Sora models
    if (provider === 'openai') {
      if (!openAiApiKey) {
        throw new Error('OPENAI_API_KEY is not configured');
      }

      // Create video with Sora
      const createResponse = await fetch('https://api.openai.com/v1/videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          prompt: job.prompt,
          size: '1280x720',
          seconds: String(duration),
        }),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('Sora API error:', createResponse.status, errorText);
        throw new Error(`Sora API error: ${createResponse.status} ${errorText}`);
      }

      const createData = await createResponse.json();
      const videoId = createData.id;
      console.log('Sora video job created:', videoId);

      // Poll for completion
      let videoUrl: string | null = null;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max

      while (!videoUrl && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        const statusResponse = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
          headers: {
            'Authorization': `Bearer ${openAiApiKey}`,
          },
        });

        if (!statusResponse.ok) {
          throw new Error('Failed to check Sora video status');
        }

        const statusData = await statusResponse.json();
        console.log('Sora video status:', statusData.status);

        if (statusData.status === 'completed') {
          // Download the video
          const downloadResponse = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
            headers: {
              'Authorization': `Bearer ${openAiApiKey}`,
            },
          });

          if (!downloadResponse.ok) {
            throw new Error('Failed to download Sora video');
          }

          const videoBlob = await downloadResponse.blob();
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

          const { data: signedData } = await supabase.storage
            .from('generations')
            .createSignedUrl(fileName, 31536000);

          videoUrl = signedData?.signedUrl || null;
          if (!videoUrl) {
            throw new Error('Failed to create signed URL');
          }
          break;
        } else if (statusData.status === 'failed') {
          const errorDetails = statusData.error ? JSON.stringify(statusData.error) : 'Unknown error';
          throw new Error(`Sora video generation failed: ${errorDetails}`);
        }

        attempts++;
      }

      if (!videoUrl) {
        throw new Error('Video generation timeout');
      }

      // Update job with result
      await supabase
        .from('jobs')
        .update({
          status: 'completed',
          result_url: videoUrl,
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
          result_url: videoUrl,
          provider: 'openai',
          metadata: { 
            model: model,
          },
        });

      console.log('Sora video job completed successfully');

      return new Response(
        JSON.stringify({ success: true, resultUrl: videoUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Replicate models
    if (!replicateApiKey || !replicate) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }

    // Map model to Replicate model ID
    const modelMap: Record<string, string> = {
      'stable-video-diffusion': 'stability-ai/stable-video-diffusion-img2vid-xt',
      'veo-3-fast': 'google/veo-3-fast',
      'pixverse-v4.5': 'pixverse/pixverse-v4.5',
    };

    const replicateModel = modelMap[model] || modelMap['stable-video-diffusion'];

    // Prepare input for Replicate
    let input: any = {};

    if (job.job_type === 'text_to_video') {
      // For direct text-to-video models (Veo, Pixverse)
      if (model === 'veo-3-fast' || model === 'pixverse-v4.5') {
        input = {
          prompt: job.prompt,
          duration: duration, // Valid values: 4, 6, or 8 seconds
        };
        
        // Add model-specific parameters
        if (model === 'pixverse-v4.5') {
          input.resolution = '720p'; // 540p, 720p, or 1080p
        }
      } else {
        // Stable Video Diffusion needs an image input
        // We'll first generate an image from the text, then convert to video
        console.log('Text-to-video: First generating image from prompt...');
        
        let imageOutput: any;
        try {
          imageOutput = await replicate.run('black-forest-labs/flux-schnell', {
            input: {
              prompt: job.prompt,
              num_outputs: 1,
            }
          }) as any;
        } catch (replicateError: any) {
          if (replicateError.message?.includes('402') || replicateError.message?.includes('Insufficient credit')) {
            throw new Error('Insufficient Replicate credits. Please add credits to your Replicate account at https://replicate.com/account/billing');
          }
          if (replicateError.message?.includes('429') || replicateError.message?.includes('Too Many Requests') || replicateError.message?.includes('throttled')) {
            throw new Error('Replicate rate limit exceeded. Please add more credits to your Replicate account to increase your rate limit at https://replicate.com/account/billing');
          }
          throw replicateError;
        }

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
      
      // All models support image-to-video
      input = {
        video: job.input_image_url,
        sizing_strategy: 'maintain_aspect_ratio',
        frames_per_second: 6,
        motion_bucket_id: 127,
      };
    }

    console.log('Running Replicate with input:', input);

    // Generate video using Replicate
    let output: any;
    try {
      output = await replicate.run(replicateModel, { input }) as any;
    } catch (replicateError: any) {
      if (replicateError.message?.includes('402') || replicateError.message?.includes('Insufficient credit')) {
        throw new Error('Insufficient Replicate credits. Please add credits to your Replicate account at https://replicate.com/account/billing');
      }
      if (replicateError.message?.includes('429') || replicateError.message?.includes('Too Many Requests') || replicateError.message?.includes('throttled')) {
        throw new Error('Replicate rate limit exceeded. Please add more credits to your Replicate account to increase your rate limit at https://replicate.com/account/billing');
      }
      throw replicateError;
    }

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

    console.log('Video job completed successfully');

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