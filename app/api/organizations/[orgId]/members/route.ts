/**
 * Organization Members API
 * Phase 2: Member Management
 * 
 * GET    /api/organizations/[orgId]/members - List members
 * POST   /api/organizations/[orgId]/members - Add member
 * DELETE /api/organizations/[orgId]/members - Remove member
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/database';
import {
  getOrganizationMembers,
  addOrganizationMember,
  removeOrganizationMember,
  updateMemberRole,
} from '@/lib/services/organization';
import { hasPermission, calculateEffectivePermissions, canManageRole } from '@/lib/permissions';

// =============================================================================
// Helper: Get user's permissions and role level
// =============================================================================

async function getUserOrgContext(userId: string, orgId: string) {
  const db = getDatabase();

  const membership = await db.organizationMember.findUnique({
    where: {
      organization_id_user_id: {
        organization_id: orgId,
        user_id: userId,
      },
    },
    include: {
      role: {
        select: {
          id: true,
          slug: true,
          permissions: true,
          hierarchy_level: true,
        },
      },
    },
  });

  if (!membership || !membership.role) {
    return null;
  }

  return {
    memberId: membership.id,
    roleId: membership.role.id,
    roleSlug: membership.role.slug,
    hierarchyLevel: membership.role.hierarchy_level,
    effectivePermissions: calculateEffectivePermissions(
      membership.role.permissions
    ),
  };
}

// =============================================================================
// GET /api/organizations/[orgId]/members
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check membership and permissions
    const context = await getUserOrgContext(user.id, orgId);
    if (!context) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission({ effectivePermissions: context.effectivePermissions } as any, 'org:members:read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const members = await getOrganizationMembers(orgId);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/organizations/[orgId]/members
// =============================================================================

interface AddMemberBody {
  userId: string;
  roleId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const context = await getUserOrgContext(user.id, orgId);
    if (!context) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Need invite permission to add members directly
    if (!hasPermission({ effectivePermissions: context.effectivePermissions } as any, 'org:members:invite')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot add members' },
        { status: 403 }
      );
    }

    const body: AddMemberBody = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // If assigning a role, check hierarchy
    if (body.roleId) {
      const db = getDatabase();
      const targetRole = await db.role.findUnique({
        where: { id: body.roleId },
        select: { hierarchy_level: true },
      });

      if (targetRole && !canManageRole(context.hierarchyLevel, targetRole.hierarchy_level)) {
        return NextResponse.json(
          { error: 'Cannot assign a role with equal or higher privileges' },
          { status: 403 }
        );
      }
    }

    const { success, error } = await addOrganizationMember(
      orgId,
      body.userId,
      body.roleId
    );

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const members = await getOrganizationMembers(orgId);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Failed to add member:', error);
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/organizations/[orgId]/members
// =============================================================================

interface RemoveMemberBody {
  userId: string;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const context = await getUserOrgContext(user.id, orgId);
    if (!context) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission({ effectivePermissions: context.effectivePermissions } as any, 'org:members:remove')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot remove members' },
        { status: 403 }
      );
    }

    const body: RemoveMemberBody = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Cannot remove yourself if you're the only owner
    if (body.userId === user.id) {
      const db = getDatabase();
      const owners = await db.organizationMember.findMany({
        where: {
          organization_id: orgId,
          role: { slug: 'org_owner' },
        },
      });

      if (owners.length === 1 && owners[0].user_id === user.id) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner. Transfer ownership first.' },
          { status: 400 }
        );
      }
    }

    // Check if trying to remove someone with higher privileges
    const targetContext = await getUserOrgContext(body.userId, orgId);
    if (targetContext && !canManageRole(context.hierarchyLevel, targetContext.hierarchyLevel)) {
      return NextResponse.json(
        { error: 'Cannot remove a member with equal or higher privileges' },
        { status: 403 }
      );
    }

    const { success, error } = await removeOrganizationMember(orgId, body.userId);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/organizations/[orgId]/members (Update role)
// =============================================================================

interface UpdateRoleBody {
  userId: string;
  roleId: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const context = await getUserOrgContext(user.id, orgId);
    if (!context) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission({ effectivePermissions: context.effectivePermissions } as any, 'org:members:update_role')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot update member roles' },
        { status: 403 }
      );
    }

    const body: UpdateRoleBody = await request.json();

    if (!body.userId || !body.roleId) {
      return NextResponse.json(
        { error: 'User ID and Role ID are required' },
        { status: 400 }
      );
    }

    // Check hierarchy for both target user and new role
    const db = getDatabase();
    const [targetContext, newRole] = await Promise.all([
      getUserOrgContext(body.userId, orgId),
      db.role.findUnique({
        where: { id: body.roleId },
        select: { hierarchy_level: true },
      }),
    ]);

    if (targetContext && !canManageRole(context.hierarchyLevel, targetContext.hierarchyLevel)) {
      return NextResponse.json(
        { error: 'Cannot modify a member with equal or higher privileges' },
        { status: 403 }
      );
    }

    if (newRole && !canManageRole(context.hierarchyLevel, newRole.hierarchy_level)) {
      return NextResponse.json(
        { error: 'Cannot assign a role with equal or higher privileges than your own' },
        { status: 403 }
      );
    }

    const { success, error } = await updateMemberRole(
      orgId,
      body.userId,
      body.roleId
    );

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const members = await getOrganizationMembers(orgId);

    return NextResponse.json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error('Failed to update member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}
