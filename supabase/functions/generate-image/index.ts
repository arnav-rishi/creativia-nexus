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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    jobId = body.jobId;

    if (!jobId) {
      throw new Error('Job ID is required');
    }

    console.log('Processing job:', jobId);

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

    const vyroApiKey = Deno.env.get('VYRO_API_KEY');
    
    if (!vyroApiKey) {
      throw new Error('VYRO_API_KEY is not configured');
    }
    const metadata = job.metadata || {};
    const model = metadata.model || 'realistic';
    const aspectRatio = metadata.aspect_ratio || '1:1';
    const seed = metadata.seed;

    let imageBlob: Blob;

    if (job.provider === 'vyro_ai') {
      console.log('Generating image with Vyro AI...', { model, aspectRatio, seed });

      // Build form data for Vyro.ai API
      const formData = new FormData();
      formData.append('prompt', job.prompt);
      formData.append('style', model);
      if (aspectRatio) {
        formData.append('aspect_ratio', aspectRatio);
      }
      if (seed) {
        formData.append('seed', seed.toString());
      }

      // Generate image using Vyro.ai API
      const response = await fetch('https://api.vyro.ai/v2/image/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vyroApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Vyro AI generation error:', error);
        throw new Error(`Vyro AI generation failed: ${error}`);
      }

      // Vyro.ai returns binary image data
      imageBlob = await response.blob();
      console.log('Image generated successfully with Vyro AI');
    } else {
      // Lovable AI (legacy support)
      console.log('Generating image with Lovable AI...');

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: `Generate a high-quality image based on this prompt: ${job.prompt}`,
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('AI generation error:', error);
        throw new Error(`AI generation failed: ${error}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        throw new Error('No image generated');
      }

      // Convert base64 to blob
      const base64Data = imageUrl.split(',')[1];
      const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      imageBlob = new Blob([binaryData], { type: 'image/png' });
      console.log('Image generated successfully with Lovable AI');
    }

    // Upload the image to storage
    const fileName = `${job.user_id}/${jobId}_${Date.now()}.png`;
    const arrayBuffer = await imageBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, uint8Array, {
        contentType: imageBlob.type || 'image/png',
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
        provider: job.provider,
        metadata: { 
          model: job.provider === 'vyro_ai' ? model : 'google/gemini-2.5-flash-image-preview',
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

    console.log('Job completed successfully');

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