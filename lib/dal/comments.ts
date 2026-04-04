/**
 * Comments Data Access Layer
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateCommentInput {
  task_id: string;
  user_id: string;
  content: string;
}

export async function getCommentsByTaskId(taskId: string): Promise<{ data: TaskComment[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
  }
  
  try {
    const comments = await prisma.taskComment.findMany({
      where: { task_id: taskId },
      orderBy: { created_at: 'asc' },
    });
    return { data: comments as TaskComment[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createComment(input: CreateCommentInput): Promise<{ data: TaskComment | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('task_comments')
      .insert(input)
      .select()
      .single();
  }
  
  try {
    const comment = await prisma.taskComment.create({ data: input });
    return { data: comment as TaskComment, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateComment(id: string, content: string): Promise<{ data: TaskComment | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('task_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const comment = await prisma.taskComment.update({
      where: { id },
      data: { content, updated_at: new Date() },
    });
    return { data: comment as TaskComment, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteComment(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase.from('task_comments').delete().eq('id', id);
    return { error };
  }
  
  try {
    await prisma.taskComment.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getCommentCount(taskId: string): Promise<number> {
  if (databaseConfig.isSupabase) {
    const { count } = await supabase
      .from('task_comments')
      .select('*', { count: 'exact', head: true })
      .eq('task_id', taskId);
    return count || 0;
  }
  
  return prisma.taskComment.count({ where: { task_id: taskId } });
}
