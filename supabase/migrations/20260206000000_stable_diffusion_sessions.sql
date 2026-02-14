-- ============================================
-- Stable Diffusion Image Generation Sessions
-- Full feature parity with Gemini Flash sessions
-- ============================================

-- Add session_type to user_sessions to distinguish between chat and image generation
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'chat';

-- Update existing sessions to have 'chat' type
UPDATE user_sessions SET session_type = 'chat' WHERE session_type IS NULL;

-- Add new columns to image_generations for enhanced tracking
ALTER TABLE image_generations 
ADD COLUMN IF NOT EXISTS negative_prompt TEXT,
ADD COLUMN IF NOT EXISTS steps INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS cfg_scale NUMERIC DEFAULT 7.5,
ADD COLUMN IF NOT EXISTS seed BIGINT,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 512,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 512,
ADD COLUMN IF NOT EXISTS batch_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER;

-- Create index for session type
CREATE INDEX IF NOT EXISTS idx_user_sessions_type ON user_sessions(session_type);

-- Add Stable Diffusion plans to session_config
INSERT INTO session_config (plan_id, model_name, token_limit_per_hour, image_credits_per_hour, video_credits_per_hour) VALUES
('sd-basic', 'stable-diffusion-v1-5', 0, 20, 0),
('sd-standard', 'stable-diffusion-xl', 0, 40, 0),
('sd-pro', 'stable-diffusion-3', 0, 80, 0)
ON CONFLICT (plan_id) DO UPDATE SET
  model_name = EXCLUDED.model_name,
  token_limit_per_hour = EXCLUDED.token_limit_per_hour,
  image_credits_per_hour = EXCLUDED.image_credits_per_hour,
  video_credits_per_hour = EXCLUDED.video_credits_per_hour;

-- Create image_sessions table for dedicated image generation conversations
CREATE TABLE IF NOT EXISTS image_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  session_id UUID REFERENCES user_sessions NOT NULL,
  title TEXT DEFAULT 'Image Generation Session',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_image_sessions_user ON image_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_image_sessions_session ON image_sessions(session_id);

-- Enable RLS on image_sessions
ALTER TABLE image_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own image sessions"
ON image_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own image sessions"
ON image_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own image sessions"
ON image_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own image sessions"
ON image_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at on image_sessions
CREATE TRIGGER update_image_sessions_updated_at
BEFORE UPDATE ON image_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add image_session_id to image_generations for grouping
ALTER TABLE image_generations 
ADD COLUMN IF NOT EXISTS image_session_id UUID REFERENCES image_sessions(id);

CREATE INDEX IF NOT EXISTS idx_image_generations_image_session ON image_generations(image_session_id);

-- Create storage bucket for SD generated images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sd-generated-images', 'sd-generated-images', true)
ON CONFLICT DO NOTHING;

-- Storage policies for SD images
CREATE POLICY "Users can upload SD images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sd-generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view SD images"
ON storage.objects FOR SELECT
USING (bucket_id = 'sd-generated-images');

CREATE POLICY "Users can delete their own SD images"
ON storage.objects FOR DELETE
USING (bucket_id = 'sd-generated-images' AND auth.uid()::text = (storage.foldername(name))[1]);
