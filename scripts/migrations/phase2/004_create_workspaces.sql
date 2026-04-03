-- Phase 2 Migration: Create Workspaces and Workspace Members Tables
-- Run this migration to create workspace-related tables

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    visibility workspace_visibility DEFAULT 'private',
    settings JSONB,
    position INTEGER DEFAULT 0,
    created_by VARCHAR(30) REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(organization_id, slug)
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    workspace_id VARCHAR(30) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(30) NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id VARCHAR(30) REFERENCES roles(id),
    status member_status DEFAULT 'active',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(workspace_id, user_id)
);

-- Create workspace_projects table (for associating projects with workspaces)
CREATE TABLE IF NOT EXISTS workspace_projects (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    workspace_id VARCHAR(30) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id VARCHAR(30) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(workspace_id, project_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_organization ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_visibility ON workspaces(visibility);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_projects_project ON workspace_projects(project_id);

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_members_updated_at ON workspace_members;
CREATE TRIGGER update_workspace_members_updated_at
    BEFORE UPDATE ON workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Migration 004: Workspaces tables created successfully';
END $$;
