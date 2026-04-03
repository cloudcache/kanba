-- Add is_admin field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin);

-- Grant admin access to the first user (optional - uncomment to use)
-- UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);
