-- Migration: 003_create_system_settings
-- Phase: 1 - Infrastructure
-- Description: Create system_settings table for application configuration
-- Compatible with: PostgreSQL, MySQL

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id VARCHAR(36) PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description VARCHAR(500),
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default configuration values
INSERT INTO system_settings (id, key, value, description, is_secret) VALUES
  ('ss_001', 'auth.providers', '["supabase"]', 'Enabled authentication providers', FALSE),
  ('ss_002', 'auth.ldap.enabled', 'false', 'Whether LDAP authentication is enabled', FALSE),
  ('ss_003', 'auth.lldap.enabled', 'false', 'Whether LLDAP authentication is enabled', FALSE),
  ('ss_004', 'auth.local.enabled', 'false', 'Whether local authentication is enabled', FALSE),
  ('ss_005', 'i18n.default_locale', 'en', 'Default language for the application', FALSE),
  ('ss_006', 'i18n.available_locales', '["en","zh-CN","zh-TW","ja"]', 'Available languages', FALSE),
  ('ss_007', 'app.name', 'Kanba', 'Application name', FALSE),
  ('ss_008', 'app.description', 'Open-source Project Management Tool', 'Application description', FALSE)
ON CONFLICT (key) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE system_settings IS 'System-wide configuration settings';
COMMENT ON COLUMN system_settings.key IS 'Configuration key in dot notation (e.g., auth.ldap.enabled)';
COMMENT ON COLUMN system_settings.value IS 'Configuration value (JSON string for complex values)';
COMMENT ON COLUMN system_settings.is_secret IS 'Whether this setting contains sensitive data';
