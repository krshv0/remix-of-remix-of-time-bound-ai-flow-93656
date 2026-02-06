-- Add generation limits to session_config
ALTER TABLE session_config 
ADD COLUMN IF NOT EXISTS image_credits_per_hour INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_credits_per_hour INTEGER DEFAULT 0;

-- Add generation tracking to user_sessions
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS images_generated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS videos_generated INTEGER DEFAULT 0;

-- Create image_generations table
CREATE TABLE IF NOT EXISTS image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-diffusion-v1-5',
  resolution TEXT DEFAULT '512x512',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_generations_user ON image_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_image_generations_session ON image_generations(session_id);

-- Create video_generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  conversation_id UUID REFERENCES conversations,
  prompt TEXT NOT NULL,
  video_url TEXT NOT NULL,
  model_used TEXT DEFAULT 'stable-video-diffusion',
  duration_seconds INTEGER DEFAULT 5,
  resolution TEXT DEFAULT '480p',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_generations_user ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_session ON video_generations(session_id);

-- Update existing plans with realistic credits
UPDATE session_config SET 
  image_credits_per_hour = 3, 
  video_credits_per_hour = 0 
WHERE plan_id = 'flash-lite';

UPDATE session_config SET 
  image_credits_per_hour = 8, 
  video_credits_per_hour = 1 
WHERE plan_id = 'flash';

UPDATE session_config SET 
  image_credits_per_hour = 15, 
  video_credits_per_hour = 3 
WHERE plan_id = 'pro';

-- Enable RLS
ALTER TABLE image_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for image_generations
CREATE POLICY "Users can view their own image generations"
ON image_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image generations"
ON image_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for video_generations
CREATE POLICY "Users can view their own video generations"
ON video_generations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video generations"
ON video_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);
