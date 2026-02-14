
-- Create video_generations table
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.user_sessions(id),
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  resolution TEXT DEFAULT '720p',
  model_used TEXT DEFAULT 'tencent/HunyuanVideo',
  generation_time_seconds INTEGER,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  num_frames INTEGER DEFAULT 49,
  fps INTEGER DEFAULT 8,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own videos"
ON public.video_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos"
ON public.video_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
ON public.video_generations FOR UPDATE
USING (auth.uid() = user_id);

-- Add videos_generated and videos_remaining to user_sessions
ALTER TABLE public.user_sessions
ADD COLUMN IF NOT EXISTS videos_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS videos_remaining INTEGER DEFAULT 0;
