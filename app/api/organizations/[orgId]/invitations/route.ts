/**
 * Organization Invitations API
 * Phase 2: Member Invitation Management
 * 
 * GET  /api/organizations/[orgId]/invitations - List pending invitations
 * POST /api/organizations/[orgId]/invitations - Create invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDatabase } from '@/lib/database';
import {
  createInvitation,
  getOrganizationInvitations,
  revokeInvitation,
} from '@/lib/services/organization';
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
// GET /api/organizations/[orgId]/invitations
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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions as any, 'org:members:read')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    const invitations = await getOrganizationInvitations(orgId);

    return NextResponse.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/organizations/[orgId]/invitations
// =============================================================================

interface CreateInvitationBody {
  email: string;
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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions as any, 'org:members:invite')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot invite members' },
        { status: 403 }
      );
    }

    const body: CreateInvitationBody = await request.json();

    // Validation
    if (!body.email || body.email.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const { token, error } = await createInvitation({
      organizationId: orgId,
      email: body.email.trim().toLowerCase(),
      roleId: body.roleId,
      invitedBy: user.id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    // In production, send email with invitation link
    // For now, return the token (would be used in invitation URL)
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/invite/${token}`;

    return NextResponse.json({
      success: true,
      data: {
        token,
        invitationUrl,
        message: 'Invitation created successfully',
      },
    });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/organizations/[orgId]/invitations
// =============================================================================

interface RevokeInvitationBody {
  invitationId: string;
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
    const permissions = await getUserOrgPermissions(user.id, orgId);
    if (!permissions) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    if (!hasPermission(permissions as any, 'org:members:invite')) {
      return NextResponse.json(
        { error: 'Permission denied: cannot revoke invitations' },
        { status: 403 }
      );
    }

    const body: RevokeInvitationBody = await request.json();

    if (!body.invitationId) {
      return NextResponse.json(
        { error: 'Invitation ID is required' },
        { status: 400 }
      );
    }

    const { success, error } = await revokeInvitation(body.invitationId);

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Failed to revoke invitation:', error);
    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}
