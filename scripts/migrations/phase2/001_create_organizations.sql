-- Phase 2 Migration: Create Organizations Table
-- Run this migration to create the organizations table and related structures

-- Create enum types
DO $$ BEGIN
    CREATE TYPE member_status AS ENUM ('active', 'suspended', 'invited', 'pending');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE workspace_visibility AS ENUM ('private', 'internal', 'public');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE project_visibility AS ENUM ('private', 'workspace', 'organization', 'public');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    billing_plan VARCHAR(50) DEFAULT 'free',
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Migration 001: Organizations table created successfully';
END $$;
