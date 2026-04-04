/**
 * Tasks Data Access Layer
 * 
 * Unified data access for tasks - supports Supabase, PostgreSQL, MySQL via Prisma
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  position: number;
  priority: 'low' | 'medium' | 'high';
  due_date: Date | string | null;
  is_done: boolean;
  created_by: string | null;
  assigned_to: string | null;
  project_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  column_id: string;
  position?: number;
  priority?: 'low' | 'medium' | 'high';
  due_date?: Date | string;
  assigned_to?: string;
  created_by?: string;
  project_id?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  column_id?: string;
  position?: number;
  priority?: 'low' | 'medium' | 'high';
  due_date?: Date | string | null;
  is_done?: boolean;
  assigned_to?: string | null;
}

// ============================================
// Task CRUD Operations
// ============================================

export async function getTaskById(id: string): Promise<{ data: Task | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('tasks').select('*').eq('id', id).single();
  }
  
  try {
    const task = await prisma.task.findUnique({ where: { id } });
    return { data: task as Task | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getTasksByColumnId(columnId: string): Promise<{ data: Task[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('column_id', columnId)
      .order('position');
  }
  
  try {
    const tasks = await prisma.task.findMany({
      where: { column_id: columnId },
      orderBy: { position: 'asc' },
    });
    return { data: tasks as Task[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAssignedTasks(userId: string, limit = 10): Promise<{ data: Task[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
  }
  
  try {
    const tasks = await prisma.task.findMany({
      where: { assigned_to: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return { data: tasks as Task[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createTask(input: CreateTaskInput): Promise<{ data: Task | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .insert({
        ...input,
        position: input.position ?? 0,
        priority: input.priority ?? 'medium',
      })
      .select()
      .single();
  }
  
  try {
    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description,
        column_id: input.column_id,
        position: input.position ?? 0,
        priority: input.priority ?? 'medium',
        due_date: input.due_date ? new Date(input.due_date) : null,
        assigned_to: input.assigned_to,
        created_by: input.created_by,
        project_id: input.project_id,
      },
    });
    return { data: task as Task, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<{ data: Task | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const task = await prisma.task.update({
      where: { id },
      data: {
        ...input,
        due_date: input.due_date ? new Date(input.due_date) : input.due_date,
        updated_at: new Date(),
      },
    });
    return { data: task as Task, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteTask(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    return { error };
  }
  
  try {
    await prisma.task.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function moveTask(
  taskId: string,
  newColumnId: string,
  newPosition: number
): Promise<{ data: Task | null; error: any }> {
  return updateTask(taskId, { column_id: newColumnId, position: newPosition });
}

export async function toggleTaskDone(id: string, isDone: boolean): Promise<{ data: Task | null; error: any }> {
  return updateTask(id, { is_done: isDone });
}

export async function assignTask(id: string, assigneeId: string | null): Promise<{ data: Task | null; error: any }> {
  return updateTask(id, { assigned_to: assigneeId });
}

// ============================================
// Task Queries
// ============================================

export async function searchTasks(
  projectId: string,
  query: string
): Promise<{ data: Task[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .ilike('title', `%${query}%`);
  }
  
  try {
    const tasks = await prisma.task.findMany({
      where: {
        project_id: projectId,
        title: { contains: query, mode: 'insensitive' },
      },
    });
    return { data: tasks as Task[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getTasksByPriority(
  projectId: string,
  priority: 'low' | 'medium' | 'high'
): Promise<{ data: Task[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('priority', priority);
  }
  
  try {
    const tasks = await prisma.task.findMany({
      where: { project_id: projectId, priority },
    });
    return { data: tasks as Task[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getOverdueTasks(userId: string): Promise<{ data: Task[] | null; error: any }> {
  const now = new Date().toISOString();
  
  if (databaseConfig.isSupabase) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .eq('is_done', false)
      .lt('due_date', now)
      .order('due_date');
  }
  
  try {
    const tasks = await prisma.task.findMany({
      where: {
        assigned_to: userId,
        is_done: false,
        due_date: { lt: new Date() },
      },
      orderBy: { due_date: 'asc' },
    });
    return { data: tasks as Task[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// Batch Operations
// ============================================

export async function updateTaskPositions(
  tasks: { id: string; position: number; column_id?: string }[]
): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    // Supabase doesn't support batch updates, so we do them one by one
    for (const task of tasks) {
      const { error } = await supabase
        .from('tasks')
        .update({ position: task.position, column_id: task.column_id })
        .eq('id', task.id);
      if (error) return { error };
    }
    return { error: null };
  }
  
  try {
    await prisma.$transaction(
      tasks.map(task =>
        prisma.task.update({
          where: { id: task.id },
          data: { position: task.position, column_id: task.column_id },
        })
      )
    );
    return { error: null };
  } catch (error) {
    return { error };
  }
}
