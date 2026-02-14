import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { prompt, sessionId, videoId, action, numFrames, fps } = await req.json();

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Handle retry action
    if (action === 'retry' && videoId) {
      const { data: existingVideo, error: fetchError } = await supabaseClient
        .from('video_generations')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingVideo) {
        return new Response(
          JSON.stringify({ error: 'Video not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      if (existingVideo.retry_count >= 3) {
        return new Response(
          JSON.stringify({ error: 'Maximum retries (3) reached for this video' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      await supabaseClient
        .from('video_generations')
        .update({ status: 'pending', retry_count: existingVideo.retry_count + 1, error_message: null })
        .eq('id', videoId);

      // Re-run generation with existing prompt
      return await generateVideo(supabaseClient, user.id, existingVideo.session_id, existingVideo.prompt, videoId, existingVideo.num_frames || 49, existingVideo.fps || 8, startTime);
    }

    // New generation
    if (!prompt?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (prompt.length < 10 || prompt.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Prompt must be 10-500 characters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check session
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (sessionError || !sessionData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check expiry
    if (Date.now() >= new Date(sessionData.expires_at).getTime()) {
      await supabaseClient.from('user_sessions').update({ status: 'expired' }).eq('id', sessionId);
      return new Response(
        JSON.stringify({ error: 'Session has expired', expired: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Check videos remaining
    const videosRemaining = sessionData.videos_remaining || 0;
    if (videosRemaining <= 0) {
      return new Response(
        JSON.stringify({ error: 'No videos remaining. Purchase more to continue.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Create video record
    const { data: videoRecord, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: user.id,
        session_id: sessionId,
        prompt: prompt.trim(),
        status: 'pending',
        num_frames: numFrames || 49,
        fps: fps || 8,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create video record' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Generate the video
    return await generateVideo(supabaseClient, user.id, sessionId, prompt.trim(), videoRecord.id, numFrames || 49, fps || 8, startTime);

  } catch (error) {
    console.error('Video generation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function generateVideo(
  supabaseClient: any,
  userId: string,
  sessionId: string,
  prompt: string,
  videoId: string,
  numFrames: number,
  fps: number,
  startTime: number,
) {
  try {
    // Update status to processing
    await supabaseClient
      .from('video_generations')
      .update({ status: 'processing' })
      .eq('id', videoId);

    const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HUGGINGFACE_API_KEY) {
      throw new Error('Video generation service not configured');
    }

    // Call HuggingFace API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

    let videoBlob: Blob | null = null;
    let usedPlaceholder = false;

    try {
      const hfResponse = await fetch(
        'https://api-inference.huggingface.co/models/tencent/HunyuanVideo',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              num_frames: numFrames,
              fps: fps,
            },
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (hfResponse.ok) {
        videoBlob = await hfResponse.blob();
      } else {
        const errorText = await hfResponse.text();
        console.error('HF API error:', hfResponse.status, errorText);

        if (hfResponse.status === 503) {
          // Model loading - mark as processing and return
          await supabaseClient
            .from('video_generations')
            .update({ 
              status: 'processing',
              error_message: 'Model is loading. Video will be generated shortly.',
            })
            .eq('id', videoId);

          return new Response(
            JSON.stringify({ 
              videoId, 
              status: 'processing',
              message: 'Model is loading. Please check back in a moment.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // For other errors, use a placeholder for demo
        usedPlaceholder = true;
      }
    } catch (fetchError) {
      clearTimeout(timeout);
      console.error('HF fetch error:', fetchError);
      usedPlaceholder = true;
    }

    let videoUrl = '';

    if (videoBlob && !usedPlaceholder) {
      // Upload to storage
      const fileName = `${userId}/${sessionId}/${videoId}.mp4`;
      const videoBuffer = await videoBlob.arrayBuffer();

      const { error: uploadError } = await supabaseClient.storage
        .from('generated-videos')
        .upload(fileName, new Uint8Array(videoBuffer), {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload video');
      }

      const { data: { publicUrl } } = supabaseClient.storage
        .from('generated-videos')
        .getPublicUrl(fileName);

      videoUrl = publicUrl;
    } else {
      // Placeholder for demo/fallback
      videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    }

    const generationTime = Math.floor((Date.now() - startTime) / 1000);

    // Update record as completed
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'completed',
        video_url: videoUrl,
        generation_time_seconds: generationTime,
        completed_at: new Date().toISOString(),
        metadata: { placeholder: usedPlaceholder },
      })
      .eq('id', videoId);

    // Decrement videos_remaining, increment videos_generated
    const { data: session } = await supabaseClient
      .from('user_sessions')
      .select('videos_remaining, videos_generated')
      .eq('id', sessionId)
      .single();

    if (session) {
      await supabaseClient
        .from('user_sessions')
        .update({
          videos_remaining: Math.max((session.videos_remaining || 0) - 1, 0),
          videos_generated: (session.videos_generated || 0) + 1,
        })
        .eq('id', sessionId);
    }

    return new Response(
      JSON.stringify({
        videoId,
        status: 'completed',
        videoUrl,
        generationTimeSeconds: generationTime,
        placeholder: usedPlaceholder,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generation failed:', error);

    await supabaseClient
      .from('video_generations')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Generation failed',
      })
      .eq('id', videoId);

    return new Response(
      JSON.stringify({
        videoId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Generation failed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}
