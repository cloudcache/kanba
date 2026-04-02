/**
 * Workspaces API
 * Phase 2: Workspace Management
 * 
 * GET  /api/organizations/[orgId]/workspaces - List workspaces
 * POST /api/organizations/[orgId]/workspaces - Create workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/database';
import {
  createWorkspace,
  getOrganizationWorkspaces,
} from '@/lib/services/workspace';
import { hasPermission, calculateEffectivePermissions } from '@/lib/permissions';

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
        },
      },
    },
  });

  if (!membership || !membership.role) {
    return null;
  }

  return {
    effectivePermissions: calculateEffectivePermissions(
      membership.role.permissions
    ),
  };
}

// =============================================================================
// GET /api/organizations/[orgId]/workspaces
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
    if (!hasPermission(permissions as any, 'workspace:read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const workspaces = await getOrganizationWorkspaces(orgId, user.id);

    return NextResponse.json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/organizations/[orgId]/workspaces
// =============================================================================

interface CreateWorkspaceBody {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: 'private' | 'internal' | 'public';
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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions as any, 'workspace:create')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot create workspaces' },
        { status: 403 }
      );
    }

    const body: CreateWorkspaceBody = await request.json();

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Workspace name is required' },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: 'Workspace name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    if (body.visibility && !['private', 'internal', 'public'].includes(body.visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility value' },
        { status: 400 }
      );
    }

    const { workspace, error } = await createWorkspace({
      organizationId: orgId,
      name: body.name.trim(),
      slug: body.slug?.trim(),
      description: body.description?.trim(),
      icon: body.icon,
      color: body.color,
      visibility: body.visibility,
      createdBy: user.id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    console.error('Failed to create workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}
