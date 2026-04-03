/**
 * Workspace Service
 * Phase 2: Organization & Workspace Management
 */

import { getDatabase } from '@/lib/database';
import { generateSlug } from './organization';

// =============================================================================
// Types
// =============================================================================

export interface CreateWorkspaceInput {
  organizationId: string;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'private' | 'internal' | 'public';
  createdBy: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'private' | 'internal' | 'public';
  settings?: Record<string, unknown>;
}

export interface WorkspaceWithDetails {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  visibility: string;
  settings: Record<string, unknown> | null;
  position: number;
  createdBy: string | null;
  createdAt: Date;
  memberCount: number;
  projectCount: number;
}

// =============================================================================
// Workspace CRUD Operations
// =============================================================================

/**
 * Create a new workspace
 */
export async function createWorkspace(
  input: CreateWorkspaceInput
): Promise<{ workspace: WorkspaceWithDetails; error?: string }> {
  const db = getDatabase();

  try {
    // Generate slug if not provided
    const slug = input.slug || generateSlug(input.name);

    // Check if slug is unique within organization
    const existing = await db.workspace.findUnique({
      where: {
        organization_id_slug: {
          organization_id: input.organizationId,
          slug,
        },
      },
    });

    if (existing) {
      return {
        workspace: null as unknown as WorkspaceWithDetails,
        error: 'Workspace slug already exists in this organization',
      };
    }

    // Get max position
    const maxPositionResult = await db.workspace.aggregate({
      where: { organization_id: input.organizationId },
      _max: { position: true },
    });
    const nextPosition = (maxPositionResult._max.position ?? -1) + 1;

    // Create workspace and add creator as admin
    const result = await db.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          organization_id: input.organizationId,
          name: input.name,
          slug,
          description: input.description,
          icon: input.icon,
          color: input.color,
          visibility: input.visibility || 'private',
          position: nextPosition,
          created_by: input.createdBy,
        },
      });

      // Get workspace_admin role
      const adminRole = await tx.role.findFirst({
        where: {
          organization_id: input.organizationId,
          slug: 'workspace_admin',
        },
      });

      // Add creator as workspace admin
      await tx.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: input.createdBy,
          role_id: adminRole?.id,
          status: 'active',
        },
      });

      return workspace;
    });

    return {
      workspace: {
        id: result.id,
        organizationId: result.organization_id,
        name: result.name,
        slug: result.slug,
        description: result.description,
        icon: result.icon,
        color: result.color,
        visibility: result.visibility,
        settings: result.settings as Record<string, unknown> | null,
        position: result.position,
        createdBy: result.created_by,
        createdAt: result.created_at,
        memberCount: 1,
        projectCount: 0,
      },
    };
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return {
      workspace: null as unknown as WorkspaceWithDetails,
      error: 'Failed to create workspace',
    };
  }
}

/**
 * Get workspace by ID
 */
export async function getWorkspace(
  id: string
): Promise<WorkspaceWithDetails | null> {
  const db = getDatabase();

  const workspace = await db.workspace.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
  });

  if (!workspace) return null;

  return {
    id: workspace.id,
    organizationId: workspace.organization_id,
    name: workspace.name,
    slug: workspace.slug,
    description: workspace.description,
    icon: workspace.icon,
    color: workspace.color,
    visibility: workspace.visibility,
    settings: workspace.settings as Record<string, unknown> | null,
    position: workspace.position,
    createdBy: workspace.created_by,
    createdAt: workspace.created_at,
    memberCount: workspace._count.members,
    projectCount: workspace._count.projects,
  };
}

/**
 * Get all workspaces in an organization
 */
export async function getOrganizationWorkspaces(
  organizationId: string,
  userId?: string
): Promise<WorkspaceWithDetails[]> {
  const db = getDatabase();

  // Build where clause based on user access
  const where: {
    organization_id: string;
    OR?: Array<{ visibility: string } | { members: { some: { user_id: string } } }>;
  } = {
    organization_id: organizationId,
  };

  // If userId provided, filter by visibility or membership
  if (userId) {
    where.OR = [
      { visibility: 'internal' },
      { visibility: 'public' },
      { members: { some: { user_id: userId } } },
    ];
  }

  const workspaces = await db.workspace.findMany({
    where,
    include: {
      _count: {
        select: {
          members: true,
          projects: true,
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  return workspaces.map((ws) => ({
    id: ws.id,
    organizationId: ws.organization_id,
    name: ws.name,
    slug: ws.slug,
    description: ws.description,
    icon: ws.icon,
    color: ws.color,
    visibility: ws.visibility,
    settings: ws.settings as Record<string, unknown> | null,
    position: ws.position,
    createdBy: ws.created_by,
    createdAt: ws.created_at,
    memberCount: ws._count.members,
    projectCount: ws._count.projects,
  }));
}

/**
 * Get workspaces for a user across all organizations
 */
export async function getUserWorkspaces(
  userId: string
): Promise<WorkspaceWithDetails[]> {
  const db = getDatabase();

  const memberships = await db.workspaceMember.findMany({
    where: {
      user_id: userId,
      status: 'active',
    },
    include: {
      workspace: {
        include: {
          _count: {
            select: {
              members: true,
              projects: true,
            },
          },
        },
      },
    },
    orderBy: {
      workspace: { position: 'asc' },
    },
  });

  return memberships.map((m) => ({
    id: m.workspace.id,
    organizationId: m.workspace.organization_id,
    name: m.workspace.name,
    slug: m.workspace.slug,
    description: m.workspace.description,
    icon: m.workspace.icon,
    color: m.workspace.color,
    visibility: m.workspace.visibility,
    settings: m.workspace.settings as Record<string, unknown> | null,
    position: m.workspace.position,
    createdBy: m.workspace.created_by,
    createdAt: m.workspace.created_at,
    memberCount: m.workspace._count.members,
    projectCount: m.workspace._count.projects,
  }));
}

/**
 * Update workspace
 */
export async function updateWorkspace(
  id: string,
  input: UpdateWorkspaceInput
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.workspace.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        icon: input.icon,
        color: input.color,
        visibility: input.visibility,
        settings: input.settings,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update workspace:', error);
    return { success: false, error: 'Failed to update workspace' };
  }
}

/**
 * Delete workspace
 */
export async function deleteWorkspace(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.workspace.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete workspace:', error);
    return { success: false, error: 'Failed to delete workspace' };
  }
}

/**
 * Reorder workspaces
 */
export async function reorderWorkspaces(
  organizationId: string,
  workspaceIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.$transaction(
      workspaceIds.map((id, index) =>
        db.workspace.update({
          where: { id },
          data: { position: index },
        })
      )
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to reorder workspaces:', error);
    return { success: false, error: 'Failed to reorder workspaces' };
  }
}

// =============================================================================
// Workspace Members
// =============================================================================

/**
 * Get workspace members
 */
export async function getWorkspaceMembers(workspaceId: string) {
  const db = getDatabase();

  const members = await db.workspaceMember.findMany({
    where: { workspace_id: workspaceId },
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
 * Add member to workspace
 */
export async function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  roleId?: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    // Get workspace to find organization
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace not found' };
    }

    // Check if user is a member of the organization
    const orgMember = await db.organizationMember.findUnique({
      where: {
        organization_id_user_id: {
          organization_id: workspace.organization_id,
          user_id: userId,
        },
      },
    });

    if (!orgMember) {
      return {
        success: false,
        error: 'User must be a member of the organization',
      };
    }

    // Get default member role if not provided
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const memberRole = await db.role.findFirst({
        where: {
          organization_id: workspace.organization_id,
          slug: 'member',
        },
      });
      finalRoleId = memberRole?.id;
    }

    await db.workspaceMember.create({
      data: {
        workspace_id: workspaceId,
        user_id: userId,
        role_id: finalRoleId,
        status: 'active',
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to add workspace member:', error);
    return { success: false, error: 'Failed to add member' };
  }
}

/**
 * Remove member from workspace
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.workspaceMember.delete({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to remove workspace member:', error);
    return { success: false, error: 'Failed to remove member' };
  }
}

/**
 * Update workspace member role
 */
export async function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.workspaceMember.update({
      where: {
        workspace_id_user_id: {
          workspace_id: workspaceId,
          user_id: userId,
        },
      },
      data: {
        role_id: roleId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update workspace member role:', error);
    return { success: false, error: 'Failed to update member role' };
  }
}

// =============================================================================
// Project Association
// =============================================================================

/**
 * Add project to workspace
 */
export async function addProjectToWorkspace(
  workspaceId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    // Get max position
    const maxPositionResult = await db.workspaceProject.aggregate({
      where: { workspace_id: workspaceId },
      _max: { position: true },
    });
    const nextPosition = (maxPositionResult._max.position ?? -1) + 1;

    await db.workspaceProject.create({
      data: {
        workspace_id: workspaceId,
        project_id: projectId,
        position: nextPosition,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to add project to workspace:', error);
    return { success: false, error: 'Failed to add project' };
  }
}

/**
 * Remove project from workspace
 */
export async function removeProjectFromWorkspace(
  workspaceId: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  const db = getDatabase();

  try {
    await db.workspaceProject.delete({
      where: {
        workspace_id_project_id: {
          workspace_id: workspaceId,
          project_id: projectId,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to remove project from workspace:', error);
    return { success: false, error: 'Failed to remove project' };
  }
}
