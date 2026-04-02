/**
 * Single Field API
 * Phase 3: Individual field operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FieldService } from '@/lib/fields/field-service';
import type { FieldConfig } from '@/lib/fields/types';

interface RouteParams {
  params: Promise<{ projectId: string; fieldId: string }>;
}

// =============================================================================
// GET /api/projects/[projectId]/fields/[fieldId]
// Get a single field
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { fieldId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const field = await FieldService.getField(fieldId);
    
    if (!field) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: field,
    });
  } catch (error) {
    console.error('Error fetching field:', error);
    return NextResponse.json(
      { error: 'Failed to fetch field' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/projects/[projectId]/fields/[fieldId]
// Update a field
// =============================================================================

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { fieldId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { name, config, position, isRequired, description } = body;
    
    const field = await FieldService.updateField(fieldId, {
      name,
      config: config as FieldConfig,
      position,
      isRequired,
      description,
    });
    
    return NextResponse.json({
      success: true,
      data: field,
    });
  } catch (error: any) {
    console.error('Error updating field:', error);
    
    if (error.message === 'Field not found') {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update field' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE /api/projects/[projectId]/fields/[fieldId]
// Delete a field
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { fieldId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await FieldService.deleteField(fieldId);
    
    return NextResponse.json({
      success: true,
      message: 'Field deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting field:', error);
    
    if (error.message === 'Field not found') {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      );
    }
    
    if (error.message === 'Cannot delete system fields') {
      return NextResponse.json(
        { error: 'Cannot delete system fields' },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete field' },
      { status: 500 }
    );
  }
}
