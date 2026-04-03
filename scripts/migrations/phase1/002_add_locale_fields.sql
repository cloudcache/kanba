-- Migration: 002_add_locale_fields
-- Phase: 1 - Infrastructure
-- Description: Add internationalization fields to profiles table
-- Compatible with: PostgreSQL, MySQL

-- Add locale column for language preference
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en';

-- Add timezone column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Update existing profiles to use defaults
UPDATE profiles SET locale = 'en' WHERE locale IS NULL;
UPDATE profiles SET timezone = 'UTC' WHERE timezone IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN profiles.locale IS 'User language preference: en, zh-CN, zh-TW, ja';
COMMENT ON COLUMN profiles.timezone IS 'User timezone preference (IANA timezone format)';
