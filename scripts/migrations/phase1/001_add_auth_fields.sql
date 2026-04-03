-- Migration: 001_add_auth_fields
-- Phase: 1 - Infrastructure
-- Description: Add authentication provider fields to profiles table
-- Compatible with: PostgreSQL, MySQL

-- Add auth_provider column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'supabase';

-- Add LDAP-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ldap_dn VARCHAR(255);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_external_id ON profiles(external_id);

-- Update existing profiles to use 'supabase' as default
UPDATE profiles SET auth_provider = 'supabase' WHERE auth_provider IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.auth_provider IS 'Authentication provider: supabase, ldap, lldap, local';
COMMENT ON COLUMN profiles.ldap_dn IS 'LDAP Distinguished Name for LDAP-authenticated users';
COMMENT ON COLUMN profiles.external_id IS 'External ID from authentication provider';
