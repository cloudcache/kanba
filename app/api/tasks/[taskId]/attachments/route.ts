/**
 * Attachments API
 * Phase 3: Task attachment management
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TaskService } from '@/lib/tasks/task-service';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

// =============================================================================
// GET /api/tasks/[taskId]/attachments
// List all attachments for a task
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
    
    const attachments = await TaskService.getAttachments(taskId);
    
    // Convert BigInt to number for JSON serialization
    const serializedAttachments = attachments.map(a => ({
      ...a,
      file_size: Number(a.file_size),
    }));
    
    return NextResponse.json({
      success: true,
      data: serializedAttachments,
    });
  } catch (error) {
    console.error('Error fetching attachments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST /api/tasks/[taskId]/attachments
// Add an attachment to a task
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
    const {
      fileName,
      fileUrl,
      fileSize,
      fileType,
      thumbnailUrl,
      storageProvider,
      storagePath,
    } = body;
    
    // Validation
    if (!fileName || !fileUrl || !fileSize || !fileType) {
      return NextResponse.json(
        { error: 'fileName, fileUrl, fileSize, and fileType are required' },
        { status: 400 }
      );
    }
    
    const attachment = await TaskService.addAttachment({
      taskId,
      fileName,
      fileUrl,
      fileSize,
      fileType,
      thumbnailUrl,
      storageProvider,
      storagePath,
      uploadedBy: user.id,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        file_size: Number(attachment.file_size),
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding attachment:', error);
    return NextResponse.json(
      { error: 'Failed to add attachment' },
      { status: 500 }
    );
  }
}
