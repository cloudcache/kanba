/**
 * Project Fields API
 * Phase 3: Custom field management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FieldService } from '@/lib/fields/field-service';
import type { FieldType, FieldConfig } from '@/lib/fields/types';

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

// =============================================================================
// GET /api/projects/[projectId]/fields
// List all fields for a project
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
    
    const fields = await FieldService.getProjectFields(projectId);
    
    return NextResponse.json({
      success: true,
      data: fields,
    });
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fields' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/projects/[projectId]/fields
// Create a new field
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
    const { name, slug, type, config, position, isRequired, description } = body;
    
    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }
    
    const field = await FieldService.createField({
      projectId,
      name,
      slug,
      type: type as FieldType,
      config: config as FieldConfig,
      position,
      isRequired,
      description,
    });
    
    return NextResponse.json({
      success: true,
      data: field,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating field:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A field with this slug already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create field' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/projects/[projectId]/fields
// Reorder fields
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
    const { fieldIds } = body;
    
    if (!Array.isArray(fieldIds)) {
      return NextResponse.json(
        { error: 'fieldIds must be an array' },
        { status: 400 }
      );
    }
    
    await FieldService.reorderFields(projectId, fieldIds);
    
    return NextResponse.json({
      success: true,
      message: 'Fields reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering fields:', error);
    return NextResponse.json(
      { error: 'Failed to reorder fields' },
      { status: 500 }
    );
  }
}
