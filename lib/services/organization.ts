/**
 * Organization Service
 * Phase 2: Organization & Workspace Management
 */

import { prisma, databaseConfig } from '@/lib/database';
import { PRESET_ROLES } from '@/lib/permissions';
import crypto from 'crypto';

// Use Prisma for all database operations (supports PostgreSQL/MySQL)
const db = prisma;

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
// Organization CRUD Operations
// =============================================================================

/**
 * Create a new organization with the creator as owner
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ organization: OrganizationWithMembers; error?: string }> {

  try {
    // Generate slug if not provided
    const slug = input.slug || generateSlug(input.name);

    // Check if slug is unique
    const existing = await db.organization.findUnique({
      where: { slug },
    });

    if (existing) {
      return {
        organization: null as unknown as OrganizationWithMembers,
        error: 'Organization slug already exists',
      };
    }

    // Create organization with owner role and membership in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          logo_url: input.logoUrl,
        },
      });

      // Create owner role
      const ownerRole = await tx.role.create({
        data: {
          organization_id: org.id,
          name: PRESET_ROLES.org_owner.name,
          slug: PRESET_ROLES.org_owner.slug,
          description: PRESET_ROLES.org_owner.description,
          permissions: PRESET_ROLES.org_owner.permissions as string[],
          is_system: true,
          hierarchy_level: PRESET_ROLES.org_owner.hierarchyLevel,
        },
      });

      // Create other preset roles
      const rolePromises = Object.entries(PRESET_ROLES)
        .filter(([key]) => key !== 'org_owner')
        .map(([, role]) =>
          tx.role.create({
            data: {
              organization_id: org.id,
              name: role.name,
              slug: role.slug,
              description: role.description,
              permissions: role.permissions as string[],
              is_system: true,
              hierarchy_level: role.hierarchyLevel,
            },
          })
        );

      await Promise.all(rolePromises);

      // Add creator as owner
      await tx.organizationMember.create({
        data: {
          organization_id: org.id,
          user_id: input.creatorId,
          role_id: ownerRole.id,
          status: 'active',
        },
      });

      return org;
    });

    return {
      organization: {
        id: result.id,
        name: result.name,
        slug: result.slug,
        logoUrl: result.logo_url,
        description: result.description,
        billingPlan: result.billing_plan,
        settings: result.settings as Record<string, unknown> | null,
        createdAt: result.created_at,
        memberCount: 1,
        workspaceCount: 0,
      },
    };
  } catch (error) {
    console.error('Failed to create organization:', error);
    return {
      organization: null as unknown as OrganizationWithMembers,
      error: 'Failed to create organization',
    };
  }
}

/**
 * Get organization by ID
 */
export async function getOrganization(
  id: string
): Promise<OrganizationWithMembers | null> {


  const org = await db.organization.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: true,
          workspaces: true,
        },
      },
    },
  });

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    description: org.description,
    billingPlan: org.billing_plan,
    settings: org.settings as Record<string, unknown> | null,
    createdAt: org.created_at,
    memberCount: org._count.members,
    workspaceCount: org._count.workspaces,
  };
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(
  slug: string
): Promise<OrganizationWithMembers | null> {


  const org = await db.organization.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          members: true,
          workspaces: true,
        },
      },
    },
  });

  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    description: org.description,
    billingPlan: org.billing_plan,
    settings: org.settings as Record<string, unknown> | null,
    createdAt: org.created_at,
    memberCount: org._count.members,
    workspaceCount: org._count.workspaces,
  };
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(
  userId: string
): Promise<OrganizationWithMembers[]> {


  const memberships = await db.organizationMember.findMany({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: {
      organization: {
        include: {
          _count: {
            select: {
              members: true,
              workspaces: true,
            },
          },
        },
      },
    },
    orderBy: {
      joined_at: 'desc',
    },
  });

  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logo_url,
    description: m.organization.description,
    billingPlan: m.organization.billing_plan,
    settings: m.organization.settings as Record<string, unknown> | null,
    createdAt: m.organization.created_at,
    memberCount: m.organization._count.members,
    workspaceCount: m.organization._count.workspaces,
  }));
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<{ success: boolean; error?: string }> {


  try {
    await db.organization.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        logo_url: input.logoUrl,
        settings: input.settings,
      },
    });

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
    await db.organization.delete({
      where: { id },
    });

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


  const members = await db.organizationMember.findMany({
    where: { organization_id: organizationId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          full_name: true,
          avatar_url: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
          slug: true,
          permissions: true,
          hierarchy_level: true,
        },
      },
    },
    orderBy: [{ role: { hierarchy_level: 'desc' } }, { joined_at: 'asc' }],
  });

  return members.map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: m.user.email,
    fullName: m.user.full_name,
    avatarUrl: m.user.avatar_url,
    role: m.role
      ? {
          id: m.role.id,
          name: m.role.name,
          slug: m.role.slug,
        }
      : null,
    status: m.status,
    joinedAt: m.joined_at,
  }));
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
    // Get default member role if not provided
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const memberRole = await db.role.findFirst({
        where: {
          organization_id: organizationId,
          slug: 'member',
        },
      });
      finalRoleId = memberRole?.id;
    }

    await db.organizationMember.create({
      data: {
        organization_id: organizationId,
        user_id: userId,
        role_id: finalRoleId,
        status: 'active',
      },
    });

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
    await db.organizationMember.delete({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
    });

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
    await db.organizationMember.update({
      where: {
        organization_id_user_id: {
          organization_id: organizationId,
          user_id: userId,
        },
      },
      data: {
        role_id: roleId,
      },
    });

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
    // Check if user is already a member
    const existingMember = await db.organizationMember.findFirst({
      where: {
        organization_id: input.organizationId,
        user: { email: input.email },
      },
    });

    if (existingMember) {
      return { token: '', error: 'User is already a member' };
    }

    // Check for existing pending invitation
    const existingInvitation = await db.invitation.findFirst({
      where: {
        organization_id: input.organizationId,
        email: input.email,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      return { token: '', error: 'Invitation already sent' };
    }

    // Get default member role if not provided
    let roleId = input.roleId;
    if (!roleId) {
      const memberRole = await db.role.findFirst({
        where: {
          organization_id: input.organizationId,
          slug: 'member',
        },
      });
      roleId = memberRole?.id;
    }

    const token = generateInvitationToken();
    const expiresAt = getInvitationExpiry();

    await db.invitation.create({
      data: {
        organization_id: input.organizationId,
        email: input.email,
        role_id: roleId,
        invited_by: input.invitedBy,
        token,
        expires_at: expiresAt,
        status: 'pending',
      },
    });

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
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation is no longer valid' };
    }

    if (invitation.expires_at < new Date()) {
      await db.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      return { success: false, error: 'Invitation has expired' };
    }

    // Accept invitation and add member in a transaction
    await db.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          accepted_at: new Date(),
        },
      });

      await tx.organizationMember.create({
        data: {
          organization_id: invitation.organization_id,
          user_id: userId,
          role_id: invitation.role_id,
          status: 'active',
        },
      });
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


  const invitations = await db.invitation.findMany({
    where: {
      organization_id: organizationId,
      status: 'pending',
    },
    include: {
      inviter: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    roleId: inv.role_id,
    invitedBy: {
      id: inv.inviter.id,
      email: inv.inviter.email,
      fullName: inv.inviter.full_name,
    },
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
  }));
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(
  invitationId: string
): Promise<{ success: boolean; error?: string }> {


  try {
    await db.invitation.update({
      where: { id: invitationId },
      data: { status: 'revoked' },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to revoke invitation:', error);
    return { success: false, error: 'Failed to revoke invitation' };
  }
}
