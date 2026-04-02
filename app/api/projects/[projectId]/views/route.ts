/**
 * Project Views API
 * Phase 3: View management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ViewService } from '@/lib/views/view-service';
import type { ViewType, ViewConfig } from '@/lib/views/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// =============================================================================
// GET /api/projects/[projectId]/views
// List all views for a project
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const includePersonal = searchParams.get('includePersonal') === 'true';
    
    const views = await ViewService.getProjectViews(projectId, {
      includePersonal,
      userId: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: views,
    });
  } catch (error) {
    console.error('Error fetching views:', error);
    return NextResponse.json(
      { error: 'Failed to fetch views' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/projects/[projectId]/views
// Create a new view
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, type, config, isDefault, isPersonal, position } = body;
    
    // Validation
    if (!name || !type || !config) {
      return NextResponse.json(
        { error: 'Name, type, and config are required' },
        { status: 400 }
      );
    }
    
    const view = await ViewService.createView({
      projectId,
      name,
      type: type as ViewType,
      config: config as ViewConfig,
      isDefault,
      isPersonal,
      position,
      createdBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: view,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating view:', error);
    return NextResponse.json(
      { error: 'Failed to create view' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/projects/[projectId]/views
// Reorder views
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { viewIds } = body;
    
    if (!Array.isArray(viewIds)) {
      return NextResponse.json(
        { error: 'viewIds must be an array' },
        { status: 400 }
      );
    }
    
    await ViewService.reorderViews(projectId, viewIds);
    
    return NextResponse.json({
      success: true,
      message: 'Views reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering views:', error);
    return NextResponse.json(
      { error: 'Failed to reorder views' },
      { status: 500 }
    );
  }
}
