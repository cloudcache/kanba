/**
 * Projects Data Access Layer
 * 
 * Unified data access for projects - supports Supabase, PostgreSQL, MySQL via Prisma
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  color: string | null;
  user_id: string;
  is_favorite: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  slug?: string;
  color?: string;
  user_id: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  color?: string;
  is_favorite?: boolean;
}

// ============================================
// Project CRUD Operations
// ============================================

export async function getProjectById(id: string): Promise<{ data: Project | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('projects').select('*').eq('id', id).single();
  }
  
  try {
    const project = await prisma.project.findUnique({ where: { id } });
    return { data: project as Project | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProjectBySlug(slug: string): Promise<{ data: Project | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('projects').select('*').eq('slug', slug).single();
  }
  
  try {
    const project = await prisma.project.findFirst({ where: { slug } });
    return { data: project as Project | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProjectByIdOrSlug(idOrSlug: string): Promise<{ data: Project | null; error: any }> {
  // Try by slug first
  let result = await getProjectBySlug(idOrSlug);
  if (result.data) return result;
  
  // Then try by id
  return getProjectById(idOrSlug);
}

export async function getUserProjects(userId: string): Promise<{ data: Project[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  }
  
  try {
    const projects = await prisma.project.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return { data: projects as Project[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getSharedProjects(userId: string): Promise<{ data: Project[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('projects')
      .select(`*, project_members!inner(role)`)
      .neq('user_id', userId)
      .eq('project_members.user_id', userId)
      .order('created_at', { ascending: false });
  }
  
  try {
    const members = await prisma.projectMember.findMany({
      where: { user_id: userId },
      include: { project: true },
    });
    const projects = members
      .filter(m => m.project.user_id !== userId)
      .map(m => m.project);
    return { data: projects as Project[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createProject(input: CreateProjectInput): Promise<{ data: Project | null; error: any }> {
  const slug = input.slug || generateSlug(input.name);
  
  if (databaseConfig.isSupabase) {
    return supabase
      .from('projects')
      .insert({ ...input, slug })
      .select()
      .single();
  }
  
  try {
    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        slug,
        color: input.color,
        user_id: input.user_id,
      },
    });
    return { data: project as Project, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<{ data: Project | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('projects')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const project = await prisma.project.update({
      where: { id },
      data: { ...input, updated_at: new Date() },
    });
    return { data: project as Project, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function deleteProject(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    return { error };
  }
  
  try {
    await prisma.project.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<{ data: Project | null; error: any }> {
  return updateProject(id, { is_favorite: isFavorite });
}

// ============================================
// Project with Relations
// ============================================

export async function getProjectWithColumns(projectId: string): Promise<{ data: any; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) return { data: null, error: projectError };
    
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('*')
      .eq('project_id', projectId)
      .order('position');
    
    if (columnsError) return { data: null, error: columnsError };
    
    return { data: { ...project, columns: columns || [] }, error: null };
  }
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
        },
      },
    });
    return { data: project, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProjectWithColumnsAndTasks(projectId: string): Promise<{ data: any; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError) return { data: null, error: projectError };
    
    const { data: columns, error: columnsError } = await supabase
      .from('columns')
      .select('*')
      .eq('project_id', projectId)
      .order('position');
    
    if (columnsError) return { data: null, error: columnsError };
    
    // Get tasks for each column
    const columnsWithTasks = await Promise.all(
      (columns || []).map(async (column) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('column_id', column.id)
          .order('position');
        return { ...column, tasks: tasks || [] };
      })
    );
    
    return { data: { ...project, columns: columnsWithTasks }, error: null };
  }
  
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        columns: {
          include: {
            tasks: {
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });
    return { data: project, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// Helpers
// ============================================

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Math.random().toString(36).substring(2, 8);
}

export async function countUserProjects(userId: string): Promise<number> {
  if (databaseConfig.isSupabase) {
    const { count } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  }
  
  return prisma.project.count({ where: { user_id: userId } });
}
