/**
 * Task Links API
 * Phase 3: Task relationship management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaskService, LinkType } from '@/lib/tasks/task-service';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// =============================================================================
// GET /api/tasks/[taskId]/links
// List all links for a task
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
    
    const links = await TaskService.getTaskLinks(taskId);
    
    return NextResponse.json({
      success: true,
      data: links,
    });
  } catch (error) {
    console.error('Error fetching task links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task links' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tasks/[taskId]/links
// Create a link to another task
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
    const { toTaskId, linkType } = body;
    
    // Validation
    if (!toTaskId || !linkType) {
      return NextResponse.json(
        { error: 'toTaskId and linkType are required' },
        { status: 400 }
      );
    }
    
    const validLinkTypes: LinkType[] = ['blocks', 'blocked_by', 'relates_to', 'duplicates', 'cloned_from', 'parent_of'];
    if (!validLinkTypes.includes(linkType)) {
      return NextResponse.json(
        { error: `Invalid link type. Must be one of: ${validLinkTypes.join(', ')}` },
        { status: 400 }
      );
    }
    
    const link = await TaskService.createLink({
      fromTaskId: taskId,
      toTaskId,
      linkType,
      createdBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: link,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task link:', error);
    
    if (error.message === 'Link already exists') {
      return NextResponse.json(
        { error: 'Link already exists' },
        { status: 409 }
      );
    }
    
    if (error.message === 'Cannot link task to itself') {
      return NextResponse.json(
        { error: 'Cannot link task to itself' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create task link' },
      { status: 500 }
    );
  }
}
