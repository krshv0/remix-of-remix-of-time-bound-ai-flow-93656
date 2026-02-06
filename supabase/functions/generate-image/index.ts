import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, sessionId, conversationId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // Check session and limits
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select(`
        *,
        session_config (
          image_credits_per_hour,
          video_credits_per_hour
        )
      `)
      .eq('id', sessionId)
      .eq('status', 'active')
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Invalid or expired session');
    }

    // Check if user has credits left
    const imagesGenerated = sessionData.images_generated || 0;
    const imageLimit = sessionData.session_config?.image_credits_per_hour || 0;

    if (imagesGenerated >= imageLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Image generation limit reached (${imageLimit} per hour). Upgrade your plan for more credits.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Call Hugging Face Stable Diffusion API
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    
    const imageResponse = await fetch(
      'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 512,
            height: 512,
            negative_prompt: "blurry, bad quality, distorted, ugly",
          },
        }),
      }
    );

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      
      // Handle model loading
      if (imageResponse.status === 503 && errorData.error?.includes('loading')) {
        return new Response(
          JSON.stringify({ 
            error: 'Model is loading. Please wait 20 seconds and try again.',
            loading: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
        );
      }
      
      throw new Error(errorData.error || 'Image generation failed');
    }

    // Response is binary image data
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.png`;
    const { error: uploadError } = await supabaseClient.storage
      .from('generated-images')
      .upload(fileName, new Uint8Array(imageBuffer), {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    // Save to database
    await supabaseClient.from('image_generations').insert({
      user_id: user.id,
      session_id: sessionId,
      conversation_id: conversationId,
      prompt: prompt,
      image_url: publicUrl,
      model_used: 'stable-diffusion-v1-5',
      resolution: '512x512',
    });

    // Update session usage
    await supabaseClient
      .from('user_sessions')
      .update({ images_generated: imagesGenerated + 1 })
      .eq('id', sessionId);

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        creditsRemaining: imageLimit - imagesGenerated - 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Image generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate image' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
