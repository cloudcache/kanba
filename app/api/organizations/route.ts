/**
 * Organizations API
 * Phase 2: Organization Management
 * 
 * GET  /api/organizations - List user's organizations
 * POST /api/organizations - Create a new organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createOrganization,
  getUserOrganizations,
} from '@/lib/services/organization';

// =============================================================================
// GET /api/organizations
// =============================================================================

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizations = await getUserOrganizations(user.id);

    return NextResponse.json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error('Failed to fetch organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/organizations
// =============================================================================

interface CreateOrganizationBody {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateOrganizationBody = await request.json();

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { error: 'Organization name must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    const { organization, error } = await createOrganization({
      name: body.name.trim(),
      slug: body.slug?.trim(),
      description: body.description?.trim(),
      logoUrl: body.logoUrl,
      creatorId: user.id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Failed to create organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
