/**
 * Organization Detail API
 * Phase 2: Organization Management
 * 
 * GET    /api/organizations/[orgId] - Get organization details
 * PATCH  /api/organizations/[orgId] - Update organization
 * DELETE /api/organizations/[orgId] - Delete organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/database';
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
} from '@/lib/services/organization';
import { hasPermission, calculateEffectivePermissions } from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

// =============================================================================
// Helper: Get user's permissions for organization
// =============================================================================

async function getUserOrgPermissions(userId: string, orgId: string) {
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
    organizationRole: {
      id: membership.role_id || '',
      slug: '',
      permissions: membership.role.permissions,
      hierarchyLevel: membership.role.hierarchy_level,
    },
    effectivePermissions: calculateEffectivePermissions(
      membership.role.permissions
    ),
  };
}

// =============================================================================
// GET /api/organizations/[orgId]
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

    // Check membership
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Check read permission
    if (!hasPermission(permissions, 'org:read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const organization = await getOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Failed to fetch organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/organizations/[orgId]
// =============================================================================

interface UpdateOrganizationBody {
  name?: string;
  description?: string;
  logoUrl?: string;
  settings?: Record<string, unknown>;
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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions, 'org:update')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot update organization' },
        { status: 403 }
      );
    }

    const body: UpdateOrganizationBody = await request.json();

    // Validation
    if (body.name !== undefined && body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name cannot be empty' },
        { status: 400 }
      );
    }

    if (body.name && body.name.length > 100) {
      return NextResponse.json(
        { error: 'Organization name must be 100 characters or less' },
        { status: 400 }
      );
    }

    const { success, error } = await updateOrganization(orgId, {
      name: body.name?.trim(),
      description: body.description?.trim(),
      logoUrl: body.logoUrl,
      settings: body.settings,
    });

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const organization = await getOrganization(orgId);

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Failed to update organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/organizations/[orgId]
// =============================================================================

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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions, 'org:delete')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot delete organization' },
        { status: 403 }
      );
    }

    const { success, error } = await deleteOrganization(orgId);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
