/**
 * Public API: Tasks
 * Phase 5: External API for tasks
 */

import { NextRequest } from 'next/server';
import { withApiAuth, ApiResponse, ApiContext } from '@/lib/api/middleware';
import { prisma } from '@/lib/database';
import { webhookService } from '@/lib/api/webhook-service';

/**
 * GET /api/v1/tasks
 * List tasks with filtering and pagination
 */
export const GET = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const { searchParams } = new URL(req.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = (page - 1) * limit;
    
    // Filters
    const projectId = searchParams.get('project_id');
    const columnId = searchParams.get('column_id');
    const assignedTo = searchParams.get('assigned_to');
    const priority = searchParams.get('priority');
    const isDone = searchParams.get('is_done');
    
    // Build where clause
    const where: any = {};
    
    if (projectId) {
      // Verify user has access to project
      where.column = {
        project: {
          id: projectId,
          project_members: {
            some: { user_id: ctx.userId },
          },
        },
      };
    } else {
      // Only return tasks from accessible projects
      where.column = {
        project: {
          project_members: {
            some: { user_id: ctx.userId },
          },
        },
      };
    }
    
    if (columnId) where.column_id = columnId;
    if (assignedTo) where.assigned_to = assignedTo;
    if (priority) where.priority = priority;
    if (isDone !== null) where.is_done = isDone === 'true';
    
    // Execute query
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          column: {
            select: { id: true, name: true, project_id: true },
          },
        },
      }),
      prisma.task.count({ where }),
    ]);
    
    return ApiResponse.success({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
  { scopes: ['read:tasks'] }
);

/**
 * POST /api/v1/tasks
 * Create a new task
 */
export const POST = withApiAuth(
  async (req: NextRequest, ctx: ApiContext) => {
    const body = await req.json();
    
    const { title, description, column_id, priority, due_date, assigned_to } = body;
    
    if (!title || !column_id) {
      return ApiResponse.badRequest('title and column_id are required');
    }
    
    // Verify user has access to the column's project
    const column = await prisma.column.findFirst({
      where: {
        id: column_id,
        project: {
          project_members: {
            some: { user_id: ctx.userId },
          },
        },
      },
      include: {
        project: true,
      },
    });
    
    if (!column) {
      return ApiResponse.notFound('Column');
    }
    
    // Get max position
    const maxPosition = await prisma.task.aggregate({
      where: { column_id },
      _max: { position: true },
    });
    
    // Create task
    const task = await prisma.task.create({
      data: {
        title,
        description,
        column_id,
        priority: priority || 'medium',
        due_date: due_date ? new Date(due_date) : null,
        assigned_to,
        created_by: ctx.userId,
        position: (maxPosition._max.position || 0) + 1,
      },
    });
    
    // Trigger webhook
    await webhookService.trigger('task.created', task, column.project_id);
    
    return ApiResponse.created(task);
  },
  { scopes: ['write:tasks'] }
);
