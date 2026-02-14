-- Create sd-generated-images storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('sd-generated-images', 'sd-generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload SD images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'sd-generated-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access
CREATE POLICY "SD images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'sd-generated-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own SD images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'sd-generated-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also ensure image_generations table has the extra columns if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'negative_prompt') THEN
    ALTER TABLE public.image_generations ADD COLUMN negative_prompt text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'steps') THEN
    ALTER TABLE public.image_generations ADD COLUMN steps integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'cfg_scale') THEN
    ALTER TABLE public.image_generations ADD COLUMN cfg_scale numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'seed') THEN
    ALTER TABLE public.image_generations ADD COLUMN seed bigint;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'width') THEN
    ALTER TABLE public.image_generations ADD COLUMN width integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'height') THEN
    ALTER TABLE public.image_generations ADD COLUMN height integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'batch_count') THEN
    ALTER TABLE public.image_generations ADD COLUMN batch_count integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'generation_time_ms') THEN
    ALTER TABLE public.image_generations ADD COLUMN generation_time_ms integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'image_generations' AND column_name = 'image_session_id') THEN
    ALTER TABLE public.image_generations ADD COLUMN image_session_id text;
  END IF;
  
  -- Ensure session_type column exists on user_sessions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_type') THEN
    ALTER TABLE public.user_sessions ADD COLUMN session_type text DEFAULT 'chat';
  END IF;
  
  -- Ensure video_credits_per_hour exists on session_config
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'session_config' AND column_name = 'video_credits_per_hour') THEN
    ALTER TABLE public.session_config ADD COLUMN video_credits_per_hour integer DEFAULT 0;
  END IF;
END $$;

-- Insert SD plan configs if not present
INSERT INTO public.session_config (plan_id, model_name, token_limit_per_hour, image_credits_per_hour)
VALUES 
  ('sd-basic', 'stable-diffusion-v1-5', 0, 20),
  ('sd-standard', 'stable-diffusion-xl', 0, 40),
  ('sd-pro', 'stable-diffusion-3', 0, 80)
ON CONFLICT DO NOTHING;