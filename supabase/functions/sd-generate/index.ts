import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GenerationParams {
  prompt: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  width?: number;
  height?: number;
  batchCount?: number;
}

interface RequestBody {
  params: GenerationParams;
  sessionId: string;
  imageSessionId?: string;
}

// Model endpoints mapping
const MODEL_ENDPOINTS: Record<string, string> = {
  'stable-diffusion-v1-5': 'https://router.huggingface.co/hf-inference/models/runwayml/stable-diffusion-v1-5',
  'stable-diffusion-xl': 'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0',
  'stable-diffusion-3': 'https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-3-medium-diffusers',
};

// Validate and sanitize parameters
function validateParams(params: GenerationParams): GenerationParams {
  return {
    prompt: params.prompt?.trim() || '',
    negativePrompt: params.negativePrompt?.trim() || 'blurry, bad quality, distorted, ugly, nsfw, watermark, text',
    steps: Math.min(Math.max(params.steps || 30, 10), 50),
    cfgScale: Math.min(Math.max(params.cfgScale || 7.5, 1), 20),
    seed: params.seed || undefined,
    width: [256, 512, 768, 1024].includes(params.width || 512) ? params.width : 512,
    height: [256, 512, 768, 1024].includes(params.height || 512) ? params.height : 512,
    batchCount: Math.min(Math.max(params.batchCount || 1, 1), 4),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { params, sessionId, imageSessionId }: RequestBody = await req.json();
    
    // Validate required fields
    if (!params?.prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client with user auth
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError?.message, 'Token present:', !!token);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Fetch session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (sessionError || !sessionData) {
      console.error('Session query error:', sessionError?.message, 'sessionId:', sessionId, 'userId:', user.id);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Fetch session config separately (no FK relationship)
    const { data: configData } = await supabaseClient
      .from('session_config')
      .select('image_credits_per_hour, model_name')
      .eq('plan_id', sessionData.plan_id)
      .single();

    // Check session expiry
    const expiresAt = new Date(sessionData.expires_at).getTime();
    if (Date.now() >= expiresAt) {
      // Update session status to expired
      await supabaseClient
        .from('user_sessions')
        .update({ status: 'expired' })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ error: 'Session has expired', expired: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check credits
    const imagesGenerated = sessionData.images_generated || 0;
    const imageLimit = configData?.image_credits_per_hour || 0;

    if (imageLimit <= 0) {
      return new Response(
        JSON.stringify({ error: 'This session does not include image generation credits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Validate and sanitize params
    const validatedParams = validateParams(params);
    const creditsNeeded = validatedParams.batchCount || 1;

    if (imagesGenerated + creditsNeeded > imageLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient credits. Need ${creditsNeeded}, have ${imageLimit - imagesGenerated} remaining.`,
          creditsRemaining: imageLimit - imagesGenerated,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Get API key
    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HUGGINGFACE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Image generation service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Determine model endpoint
    const modelName = configData?.model_name || sessionData.model_name || 'stable-diffusion-v1-5';
    const modelEndpoint = MODEL_ENDPOINTS[modelName] || MODEL_ENDPOINTS['stable-diffusion-v1-5'];

    // Generate images
    const generatedImages: Array<{
      url: string;
      seed: number;
    }> = [];

    for (let i = 0; i < (validatedParams.batchCount || 1); i++) {
      // Generate random seed if not provided
      const seed = validatedParams.seed 
        ? validatedParams.seed + i 
        : Math.floor(Math.random() * 2147483647);

      const imageResponse = await fetch(modelEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: validatedParams.prompt,
          parameters: {
            negative_prompt: validatedParams.negativePrompt,
            num_inference_steps: validatedParams.steps,
            guidance_scale: validatedParams.cfgScale,
            width: validatedParams.width,
            height: validatedParams.height,
            seed: seed,
          },
        }),
      });

      if (!imageResponse.ok) {
        const errorData = await imageResponse.json().catch(() => ({}));
        
        // Handle model loading
        if (imageResponse.status === 503) {
          const estimatedTime = errorData.estimated_time || 20;
          return new Response(
            JSON.stringify({ 
              error: `Model is loading. Please wait ${Math.ceil(estimatedTime)} seconds and try again.`,
              loading: true,
              estimatedTime: Math.ceil(estimatedTime),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
          );
        }

        // Handle rate limit
        if (imageResponse.status === 429) {
          return new Response(
            JSON.stringify({ 
              error: 'Rate limited by image generation service. Please wait a moment and try again.',
              rateLimited: true,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
          );
        }
        
        throw new Error(errorData.error || `Generation failed: ${imageResponse.status}`);
      }

      // Get image blob
      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();

      // Upload to Supabase Storage
      const fileName = `${user.id}/${sessionId}/${Date.now()}-${i}.png`;
      const { error: uploadError } = await supabaseClient.storage
        .from('sd-generated-images')
        .upload(fileName, new Uint8Array(imageBuffer), {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to save generated image');
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from('sd-generated-images')
        .getPublicUrl(fileName);

      generatedImages.push({
        url: publicUrl,
        seed: seed,
      });
    }

    const generationTime = Date.now() - startTime;

    // Save generations to database
    const insertPromises = generatedImages.map((img) =>
      supabaseClient.from('image_generations').insert({
        user_id: user.id,
        session_id: sessionId,
        image_session_id: imageSessionId || null,
        prompt: validatedParams.prompt,
        negative_prompt: validatedParams.negativePrompt,
        image_url: img.url,
        model_used: modelName,
        resolution: `${validatedParams.width}x${validatedParams.height}`,
        steps: validatedParams.steps,
        cfg_scale: validatedParams.cfgScale,
        seed: img.seed,
        width: validatedParams.width,
        height: validatedParams.height,
        batch_count: validatedParams.batchCount,
        generation_time_ms: generationTime,
      }).select().single()
    );

    const insertResults = await Promise.all(insertPromises);
    const savedGenerations = insertResults
      .filter(r => !r.error)
      .map(r => r.data);

    // Update session usage
    const newImagesGenerated = imagesGenerated + generatedImages.length;
    await supabaseClient
      .from('user_sessions')
      .update({ images_generated: newImagesGenerated })
      .eq('id', sessionId);

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        images: savedGenerations.map(gen => ({
          id: gen.id,
          url: gen.image_url,
          seed: gen.seed,
          prompt: gen.prompt,
          negativePrompt: gen.negative_prompt,
          width: gen.width,
          height: gen.height,
          steps: gen.steps,
          cfgScale: gen.cfg_scale,
          createdAt: gen.created_at,
        })),
        generationTimeMs: generationTime,
        creditsUsed: generatedImages.length,
        creditsRemaining: imageLimit - newImagesGenerated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('SD Generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate image';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
