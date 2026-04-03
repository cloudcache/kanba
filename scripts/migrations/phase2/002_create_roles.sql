-- Phase 2 Migration: Create Roles Table
-- Run this migration to create the roles table for RBAC

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    organization_id VARCHAR(30) REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    permissions TEXT[] DEFAULT '{}',
    is_system BOOLEAN DEFAULT FALSE,
    hierarchy_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_organization ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_system ON roles(is_system);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert system roles (template - actual roles created per organization)
-- These are global system role templates that will be copied to each new organization

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Migration 002: Roles table created successfully';
END $$;
