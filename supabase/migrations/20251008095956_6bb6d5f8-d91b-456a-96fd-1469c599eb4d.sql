-- Update existing active sessions with old model names to new ones
UPDATE public.user_sessions
SET model_name = CASE 
  WHEN model_name = 'gemini-1.5-flash' THEN 'google/gemini-2.5-flash-lite'
  WHEN model_name = 'gemini-1.5-pro' THEN 'google/gemini-2.5-flash'
  WHEN model_name = 'gpt-4o' THEN 'google/gemini-2.5-pro'
  ELSE model_name
END
WHERE status = 'active' AND model_name IN ('gemini-1.5-flash', 'gemini-1.5-pro', 'gpt-4o');