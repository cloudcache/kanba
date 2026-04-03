/**
 * Subtasks API
 * Phase 3: Subtask management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaskService } from '@/lib/tasks/task-service';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// =============================================================================
// GET /api/tasks/[taskId]/subtasks
// List all subtasks for a task
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const subtasks = await TaskService.getSubtasks(taskId);
    
    return NextResponse.json({
      success: true,
      data: subtasks,
    });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subtasks' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tasks/[taskId]/subtasks
// Create a new subtask
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { title, description, position } = body;
    
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const subtask = await TaskService.createSubtask({
      parentId: taskId,
      title,
      description,
      position,
      createdBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: subtask,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating subtask:', error);
    
    if (error.message === 'Parent task not found') {
      return NextResponse.json(
        { error: 'Parent task not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create subtask' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT /api/tasks/[taskId]/subtasks
// Reorder subtasks
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { taskId } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { taskIds } = body;
    
    if (!Array.isArray(taskIds)) {
      return NextResponse.json(
        { error: 'taskIds must be an array' },
        { status: 400 }
      );
    }
    
    await TaskService.reorderSubtasks(taskId, taskIds);
    
    return NextResponse.json({
      success: true,
      message: 'Subtasks reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering subtasks:', error);
    return NextResponse.json(
      { error: 'Failed to reorder subtasks' },
      { status: 500 }
    );
  }
}
