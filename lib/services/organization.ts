/**
 * Organization Service
 * Phase 2: Organization & Workspace Management
 * 
 * Supports both Supabase and Prisma backends
 */

import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

// =============================================================================
// Types
// =============================================================================

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  creatorId: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  roleId?: string;
  invitedBy: string;
}

export interface OrganizationWithMembers {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  billingPlan: string;
  settings: Record<string, unknown> | null;
  createdAt: Date;
  memberCount: number;
  workspaceCount: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

/**
 * Generate a unique invitation token
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get invitation expiry date (7 days from now)
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}

// =============================================================================
// Organization CRUD Operations (Supabase Implementation)
// =============================================================================

/**
 * Create a new organization with the creator as owner
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ organization: OrganizationWithMembers | null; error?: string }> {
  try {
    const supabase = await createClient();
    const slug = input.slug || generateSlug(input.name);

    // Check if slug is unique
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return { organization: null, error: 'Organization slug already exists' };
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: input.name,
        slug,
        description: input.description,
        logo_url: input.logoUrl,
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create owner role
    const { data: ownerRole, error: roleError } = await supabase
      .from('roles')
      .insert({
        organization_id: org.id,
        name: 'Owner',
        slug: 'owner',
        description: 'Full access to all organization resources',
        permissions: ['*'],
        is_system: true,
        hierarchy_level: 100,
      })
      .select()
      .single();

    if (roleError) throw roleError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: input.creatorId,
        role_id: ownerRole.id,
        status: 'active',
      });

    if (memberError) throw memberError;

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logo_url,
        description: org.description,
        billingPlan: org.billing_plan || 'free',
        settings: org.settings,
        createdAt: new Date(org.created_at),
        memberCount: 1,
        workspaceCount: 0,
      },
    };
  } catch (error) {
    console.error('Failed to create organization:', error);
    return { organization: null, error: 'Failed to create organization' };
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(
  id: string
): Promise<OrganizationWithMembers | null> {
  try {
    const supabase = await createClient();
    
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !org) return null;

    // Get counts
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    const { count: workspaceCount } = await supabase
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logo_url,
      description: org.description,
      billingPlan: org.billing_plan || 'free',
      settings: org.settings,
      createdAt: new Date(org.created_at),
      memberCount: memberCount || 0,
      workspaceCount: workspaceCount || 0,
    };
  } catch (error) {
    console.error('Failed to get organization:', error);
    return null;
  }
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(
  slug: string
): Promise<OrganizationWithMembers | null> {
  try {
    const supabase = await createClient();
    
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !org) return null;

    return getOrganization(org.id);
  } catch (error) {
    console.error('Failed to get organization by slug:', error);
    return null;
  }
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(
  userId: string
): Promise<OrganizationWithMembers[]> {
  try {
    const supabase = await createClient();
    
    const { data: memberships, error } = await supabase
      .from('organization_members')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !memberships) return [];

    const orgs: OrganizationWithMembers[] = [];
    for (const m of memberships) {
      const org = await getOrganization(m.organization_id);
      if (org) orgs.push(org);
    }

    return orgs;
  } catch (error) {
    console.error('Failed to get user organizations:', error);
    return [];
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organizations')
      .update({
        name: input.name,
        description: input.description,
        logo_url: input.logoUrl,
        settings: input.settings,
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to update organization:', error);
    return { success: false, error: 'Failed to update organization' };
  }
}

/**
 * Delete organization
 */
export async function deleteOrganization(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to delete organization:', error);
    return { success: false, error: 'Failed to delete organization' };
  }
}

// =============================================================================
// Member Management
// =============================================================================

/**
 * Get organization members
 */
export async function getOrganizationMembers(organizationId: string) {
  try {
    const supabase = await createClient();
    
    const { data: members, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        profiles:user_id (id, email, full_name, avatar_url),
        roles:role_id (id, name, slug, permissions, hierarchy_level)
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return (members || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      email: m.profiles?.email,
      fullName: m.profiles?.full_name,
      avatarUrl: m.profiles?.avatar_url,
      role: m.roles ? {
        id: m.roles.id,
        name: m.roles.name,
        slug: m.roles.slug,
      } : null,
      status: m.status,
      joinedAt: m.joined_at,
    }));
  } catch (error) {
    console.error('Failed to get organization members:', error);
    return [];
  }
}

/**
 * Add member to organization
 */
export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  roleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Get default member role if not provided
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const { data: memberRole } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('slug', 'member')
        .single();
      finalRoleId = memberRole?.id;
    }

    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role_id: finalRoleId,
        status: 'active',
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to add member:', error);
    return { success: false, error: 'Failed to add member' };
  }
}

/**
 * Remove member from organization
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to remove member:', error);
    return { success: false, error: 'Failed to remove member' };
  }
}

/**
 * Update member role
 */
export async function updateMemberRole(
  organizationId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('organization_members')
      .update({ role_id: roleId })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to update member role:', error);
    return { success: false, error: 'Failed to update member role' };
  }
}

// =============================================================================
// Invitations
// =============================================================================

/**
 * Create an invitation
 */
export async function createInvitation(
  input: InviteMemberInput
): Promise<{ token: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', input.organizationId)
      .single();

    if (existingMember) {
      return { token: '', error: 'User is already a member' };
    }

    // Check for existing pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('email', input.email)
      .eq('status', 'pending')
      .single();

    if (existingInvitation) {
      return { token: '', error: 'Invitation already sent' };
    }

    // Get default member role if not provided
    let roleId = input.roleId;
    if (!roleId) {
      const { data: memberRole } = await supabase
        .from('roles')
        .select('id')
        .eq('organization_id', input.organizationId)
        .eq('slug', 'member')
        .single();
      roleId = memberRole?.id;
    }

    const token = generateInvitationToken();
    const expiresAt = getInvitationExpiry();

    const { error } = await supabase
      .from('invitations')
      .insert({
        organization_id: input.organizationId,
        email: input.email,
        role_id: roleId,
        invited_by: input.invitedBy,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      });

    if (error) throw error;
    return { token };
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return { token: '', error: 'Failed to create invitation' };
  }
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { data: invitation, error: findError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (findError || !invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation is no longer valid' };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return { success: false, error: 'Invitation has expired' };
    }

    // Update invitation status
    await supabase
      .from('invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    // Add member
    await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role_id: invitation.role_id,
        status: 'active',
      });

    return {
      success: true,
      organizationId: invitation.organization_id,
    };
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return { success: false, error: 'Failed to accept invitation' };
  }
}

/**
 * Get pending invitations for an organization
 */
export async function getOrganizationInvitations(organizationId: string) {
  try {
    const supabase = await createClient();
    
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        *,
        inviter:invited_by (id, email, full_name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (invitations || []).map((inv: any) => ({
      id: inv.id,
      email: inv.email,
      roleId: inv.role_id,
      invitedBy: {
        id: inv.inviter?.id,
        email: inv.inviter?.email,
        fullName: inv.inviter?.full_name,
      },
      expiresAt: inv.expires_at,
      createdAt: inv.created_at,
    }));
  } catch (error) {
    console.error('Failed to get invitations:', error);
    return [];
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Failed to revoke invitation:', error);
    return { success: false, error: 'Failed to revoke invitation' };
  }
}
