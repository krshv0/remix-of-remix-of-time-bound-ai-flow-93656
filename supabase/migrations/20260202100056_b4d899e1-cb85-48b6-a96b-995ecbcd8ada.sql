-- Drop the existing unique constraint on plan_id
ALTER TABLE session_config DROP CONSTRAINT IF EXISTS session_config_plan_id_key;

-- Add a composite unique constraint on plan_id + model_name
ALTER TABLE session_config ADD CONSTRAINT session_config_plan_model_unique UNIQUE (plan_id, model_name);

-- Insert default token limits for different plan/model combinations
INSERT INTO session_config (plan_id, model_name, token_limit_per_hour) VALUES
('basic', 'google/gemini-2.5-flash-lite', 100000),
('basic', 'google/gemini-2.5-flash', 100000),
('standard', 'google/gemini-2.5-flash', 150000),
('standard', 'google/gemini-2.5-pro', 100000),
('pro', 'google/gemini-2.5-flash', 200000),
('pro', 'google/gemini-2.5-pro', 150000)
ON CONFLICT (plan_id, model_name) DO UPDATE SET token_limit_per_hour = EXCLUDED.token_limit_per_hour;