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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();

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

    console.log('Generating image with Lovable AI...');

    // Generate image using Lovable AI
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

    console.log('Image generated successfully');

    // Upload the image to storage
    const fileName = `${job.user_id}/${jobId}_${Date.now()}.png`;
    
    // Convert base64 to blob
    const base64Data = imageUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const { error: uploadError } = await supabase.storage
      .from('generations')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generations')
      .getPublicUrl(fileName);

    console.log('Image uploaded to storage:', publicUrl);

    // Update job with result
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        result_url: publicUrl,
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
        result_url: publicUrl,
        provider: job.provider,
        metadata: { model: 'google/gemini-2.5-flash-image-preview' },
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
      JSON.stringify({ success: true, resultUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    
    // Update job status to failed
    if (req.json) {
      const { jobId } = await req.json().catch(() => ({}));
      if (jobId) {
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
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});