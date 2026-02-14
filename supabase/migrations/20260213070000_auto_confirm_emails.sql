-- Auto-confirm all user emails on signup
-- This creates a trigger that automatically sets email_confirmed_at
-- so users never need to verify their email

-- Confirm any existing unconfirmed users first
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;

-- Create function to auto-confirm emails on new user signup
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users to auto-confirm on insert
DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;

CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_email();
