import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const vyroApiKey = Deno.env.get('VYRO_API_KEY') || 'vk-UCRsgoCH1osWLmqB97D4xrmZq3bIWc4c31BO4izm8R9MD';
    
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Update job status to processing
    await supabase
      .from('jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const metadata = job.metadata || {};
    const model = metadata.model || 'kling-1.0-pro';
    const aspectRatio = metadata.aspect_ratio || '1:1';

    console.log('Generating video with Vyro AI...', { model, aspectRatio, jobType: job.job_type });

    // Build form data for Vyro.ai API
    const formData = new FormData();
    formData.append('prompt', job.prompt);
    formData.append('style', model);
    if (aspectRatio) {
      formData.append('aspect_ratio', aspectRatio);
    }

    // Handle image-to-video: download and attach image
    if (job.job_type === 'image_to_video' && job.input_image_url) {
      console.log('Downloading input image for image-to-video...');
      const imageResponse = await fetch(job.input_image_url);
      if (!imageResponse.ok) {
        throw new Error('Failed to download input image');
      }
      const imageBlob = await imageResponse.blob();
      formData.append('image', imageBlob, 'input.jpg');
    }

    // Determine endpoint based on job type
    const endpoint = job.job_type === 'image_to_video' 
      ? 'https://api.vyro.ai/v2/video/image-to-video'
      : 'https://api.vyro.ai/v2/video/text-to-video';

    // Generate video using Vyro.ai API
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vyroApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vyro AI video generation error:', error);
      throw new Error(`Vyro AI video generation failed: ${error}`);
    }

    const data = await response.json();
    const videoId = data.id;

    if (!videoId) {
      throw new Error('No video ID returned from API');
    }

    console.log('Video generation started, ID:', videoId);

    // Store video ID in job metadata for status polling
    await supabase
      .from('jobs')
      .update({
        metadata: {
          ...metadata,
          vyro_video_id: videoId,
        },
      })
      .eq('id', jobId);

    // Start polling for video status
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (5 second intervals)
    let videoUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      console.log(`Checking video status (attempt ${attempts}/${maxAttempts})...`);

      const statusResponse = await fetch(`https://api.vyro.ai/v2/assets/${videoId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${vyroApiKey}`,
        },
      });

      if (!statusResponse.ok) {
        console.error('Status check failed:', await statusResponse.text());
        continue;
      }

      const statusData = await statusResponse.json();

      if (statusData.status === 'success' && statusData.video?.status === 'finished') {
        videoUrl = statusData.video.url?.generation;
        thumbnailUrl = statusData.video.url?.thumbnail;
        console.log('Video generation completed!', { videoUrl, thumbnailUrl });
        break;
      } else if (statusData.video?.status === 'failed' || statusData.status === 'error') {
        throw new Error(`Video generation failed: ${statusData.message || 'Unknown error'}`);
      }

      console.log(`Video status: ${statusData.video?.status || statusData.status}, continuing to poll...`);
    }

    if (!videoUrl) {
      throw new Error('Video generation timed out or failed');
    }

    // Download the video
    console.log('Downloading video...');
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

    // For private buckets, we need to use signed URLs or make bucket public
    // Try to get public URL first, but it may not work for private buckets
    const { data: { publicUrl } } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    // Also create a signed URL as fallback (valid for 1 year)
    const { data: signedData } = await supabase.storage
      .from('generations')
      .createSignedUrl(fileName, 31536000); // 1 year

    // Use signed URL if available, otherwise use public URL
    const finalUrl = signedData?.signedUrl || publicUrl;

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
        provider: job.provider,
        metadata: { 
          model,
          aspect_ratio: aspectRatio,
          thumbnail_url: thumbnailUrl,
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

