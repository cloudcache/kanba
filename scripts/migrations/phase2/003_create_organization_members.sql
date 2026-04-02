-- Phase 2 Migration: Create Organization Members Table
-- Run this migration to create the organization_members table

-- Create organization_members table
CREATE TABLE IF NOT EXISTS organization_members (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id VARCHAR(30) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id VARCHAR(30) REFERENCES roles(id),
    status member_status DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members;
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Migration 003: Organization members table created successfully';
END $$;
