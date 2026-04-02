/**
 * Single View API
 * Phase 3: Individual view operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ViewService } from '@/lib/views/view-service';
import type { ViewConfig } from '@/lib/views/types';

interface RouteParams {
  params: Promise<{ projectId: string; viewId: string }>;
}

// =============================================================================
// GET /api/projects/[projectId]/views/[viewId]
// Get a single view
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { viewId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const view = await ViewService.getView(viewId);
    
    if (!view) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: view,
    });
  } catch (error) {
    console.error('Error fetching view:', error);
    return NextResponse.json(
      { error: 'Failed to fetch view' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/projects/[projectId]/views/[viewId]
// Update a view
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { viewId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, config, isDefault, isLocked, position } = body;
    
    const view = await ViewService.updateView(viewId, {
      name,
      config: config as ViewConfig,
      isDefault,
      isLocked,
      position,
    });
    
    return NextResponse.json({
      success: true,
      data: view,
    });
  } catch (error: any) {
    console.error('Error updating view:', error);
    
    if (error.message === 'View not found') {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }
    
    if (error.message === 'Cannot modify locked view') {
      return NextResponse.json(
        { error: 'Cannot modify locked view' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update view' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/projects/[projectId]/views/[viewId]
// Delete a view
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { viewId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await ViewService.deleteView(viewId);
    
    return NextResponse.json({
      success: true,
      message: 'View deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting view:', error);
    
    if (error.message === 'View not found') {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }
    
    if (error.message === 'Cannot delete locked view') {
      return NextResponse.json(
        { error: 'Cannot delete locked view' },
        { status: 403 }
      );
    }
    
    if (error.message === 'Cannot delete the only view') {
      return NextResponse.json(
        { error: 'Cannot delete the only view' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete view' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/projects/[projectId]/views/[viewId]
// Duplicate a view
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { viewId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name } = body;
    
    const view = await ViewService.duplicateView({
      viewId,
      name,
      createdBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: view,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error duplicating view:', error);
    
    if (error.message === 'View not found') {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to duplicate view' },
      { status: 500 }
    );
  }
}
