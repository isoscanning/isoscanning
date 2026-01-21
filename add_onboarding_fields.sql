-- Add cpf and username columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14) UNIQUE,
ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.cpf IS 'CPF of the user, required for onboarding';
COMMENT ON COLUMN profiles.username IS 'Unique username for the platform';
