-- Phase 2 Migration: Create Invitations Table
-- Run this migration to create the invitations table for member invitations

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(30) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
    organization_id VARCHAR(30) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role_id VARCHAR(30) REFERENCES roles(id),
    invited_by VARCHAR(30) NOT NULL REFERENCES profiles(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    status invitation_status DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Phase 2 Migration 005: Invitations table created successfully';
END $$;
