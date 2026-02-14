-- Disable email verification completely
-- This script updates all existing users to have confirmed emails

-- Confirm all existing user emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;
