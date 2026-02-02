-- Update session_config with correct model names for Lovable AI
UPDATE public.session_config
SET model_name = CASE plan_id
  WHEN 'basic' THEN 'google/gemini-2.5-flash-lite'
  WHEN 'standard' THEN 'google/gemini-2.5-flash'
  WHEN 'pro' THEN 'google/gemini-2.5-pro'
END
WHERE plan_id IN ('basic', 'standard', 'pro');