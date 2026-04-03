/**
 * Accept Invitation API
 * Phase 2: Invitation Flow
 * 
 * POST /api/invitations/[token]/accept - Accept an invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptInvitation } from '@/lib/services/organization';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Please sign in to accept this invitation' },
        { status: 401 }
      );
    }

    const { success, organizationId, error } = await acceptInvitation(
      token,
      user.id
    );

    if (!success) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        organizationId,
        message: 'Invitation accepted successfully',
      },
    });
  } catch (error) {
    console.error('Failed to accept invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
