
-- Create storage bucket for generated videos
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-videos', 'generated-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for generated-videos bucket
CREATE POLICY "Anyone can view generated videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-videos');

CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
