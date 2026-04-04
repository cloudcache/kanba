/**
 * Columns Data Access Layer
 * 
 * Unified data access for columns - supports Supabase, PostgreSQL, MySQL via Prisma
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface Column {
  id: string;
  title: string;
  name: string | null;
  position: number;
  project_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateColumnInput {
  title: string;
  name?: string;
  position?: number;
  project_id: string;
  created_by?: string;
}

export interface UpdateColumnInput {
  title?: string;
  name?: string;
  position?: number;
}

// ============================================
// Column CRUD Operations
// ============================================

export async function getColumnById(id: string): Promise<{ data: Column | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('columns').select('*').eq('id', id).single();
  }
  
  try {
    const column = await prisma.column.findUnique({ where: { id } });
    return { data: column as Column | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getColumnsByProjectId(projectId: string): Promise<{ data: Column[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('columns')
      .select('*')
      .eq('project_id', projectId)
      .order('position');
  }
  
  try {
    const columns = await prisma.column.findMany({
      where: { project_id: projectId },
      orderBy: { position: 'asc' },
    });
    return { data: columns as Column[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createColumn(input: CreateColumnInput): Promise<{ data: Column | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('columns')
      .insert({
        ...input,
        name: input.name || input.title,
        position: input.position ?? 0,
      })
      .select()
      .single();
  }
  
  try {
    const column = await prisma.column.create({
      data: {
        title: input.title,
        name: input.name || input.title,
        position: input.position ?? 0,
        project_id: input.project_id,
        created_by: input.created_by,
      },
    });
    return { data: column as Column, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateColumn(id: string, input: UpdateColumnInput): Promise<{ data: Column | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('columns')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const column = await prisma.column.update({
      where: { id },
      data: { ...input, updated_at: new Date() },
    });
    return { data: column as Column, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteColumn(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase.from('columns').delete().eq('id', id);
    return { error };
  }
  
  try {
    await prisma.column.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

// ============================================
// Column with Tasks
// ============================================

export async function getColumnWithTasks(columnId: string): Promise<{ data: any; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data: column, error: columnError } = await supabase
      .from('columns')
      .select('*')
      .eq('id', columnId)
      .single();
    
    if (columnError) return { data: null, error: columnError };
    
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('column_id', columnId)
      .order('position');
    
    if (tasksError) return { data: null, error: tasksError };
    
    return { data: { ...column, tasks: tasks || [] }, error: null };
  }
  
  try {
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        tasks: {
          orderBy: { position: 'asc' },
        },
      },
    });
    return { data: column, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// Batch Operations
// ============================================

export async function updateColumnPositions(
  columns: { id: string; position: number }[]
): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    for (const column of columns) {
      const { error } = await supabase
        .from('columns')
        .update({ position: column.position })
        .eq('id', column.id);
      if (error) return { error };
    }
    return { error: null };
  }
  
  try {
    await prisma.$transaction(
      columns.map(column =>
        prisma.column.update({
          where: { id: column.id },
          data: { position: column.position },
        })
      )
    );
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function createDefaultColumns(projectId: string, createdBy?: string): Promise<{ data: Column[] | null; error: any }> {
  const defaultColumns = [
    { title: 'To Do', name: 'To Do', position: 0 },
    { title: 'In Progress', name: 'In Progress', position: 1 },
    { title: 'Done', name: 'Done', position: 2 },
  ];
  
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('columns')
      .insert(
        defaultColumns.map(col => ({
          ...col,
          project_id: projectId,
          created_by: createdBy,
        }))
      )
      .select();
    return { data: data as Column[], error };
  }
  
  try {
    const columns = await prisma.$transaction(
      defaultColumns.map(col =>
        prisma.column.create({
          data: {
            ...col,
            project_id: projectId,
            created_by: createdBy,
          },
        })
      )
    );
    return { data: columns as Column[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}
