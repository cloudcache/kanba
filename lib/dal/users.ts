/**
 * Users/Profiles Data Access Layer
 * 
 * Unified data access for user profiles - supports Supabase, PostgreSQL, MySQL via Prisma
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_status: 'free' | 'pro' | 'enterprise' | null;
  stripe_customer_id: string | null;
  is_admin: boolean;
  locale: string | null;
  timezone: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UpdateProfileInput {
  full_name?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

// ============================================
// Profile CRUD Operations
// ============================================

export async function getProfileById(id: string): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('profiles').select('*').eq('id', id).single();
  }
  
  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    return { data: profile as Profile | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getProfileByEmail(email: string): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase.from('profiles').select('*').eq('email', email).single();
  }
  
  try {
    const profile = await prisma.profile.findFirst({ where: { email } });
    return { data: profile as Profile | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('profiles')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const profile = await prisma.profile.update({
      where: { id },
      data: { ...input, updated_at: new Date() },
    });
    return { data: profile as Profile, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createProfile(data: {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('profiles')
      .insert(data)
      .select()
      .single();
  }
  
  try {
    const profile = await prisma.profile.create({ data });
    return { data: profile as Profile, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// Admin Operations
// ============================================

export async function getAllProfiles(options?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<{ data: Profile[] | null; error: any; count?: number }> {
  const { limit = 50, offset = 0, search } = options || {};
  
  if (databaseConfig.isSupabase) {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });
    
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    return { data: data as Profile[], error, count: count || undefined };
  }
  
  try {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { full_name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};
    
    const [profiles, count] = await Promise.all([
      prisma.profile.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.profile.count({ where }),
    ]);
    
    return { data: profiles as Profile[], error: null, count };
  } catch (error) {
    return { data: null, error };
  }
}

export async function setAdminStatus(id: string, isAdmin: boolean): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('profiles')
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const profile = await prisma.profile.update({
      where: { id },
      data: { is_admin: isAdmin, updated_at: new Date() },
    });
    return { data: profile as Profile, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updateSubscriptionStatus(
  id: string,
  status: 'free' | 'pro' | 'enterprise',
  stripeCustomerId?: string
): Promise<{ data: Profile | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('profiles')
      .update({
        subscription_status: status,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const profile = await prisma.profile.update({
      where: { id },
      data: {
        subscription_status: status,
        stripe_customer_id: stripeCustomerId,
        updated_at: new Date(),
      },
    });
    return { data: profile as Profile, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ============================================
// Stats
// ============================================

export async function getProfileStats(): Promise<{
  total: number;
  free: number;
  pro: number;
  enterprise: number;
  admins: number;
}> {
  if (databaseConfig.isSupabase) {
    const [
      { count: total },
      { count: free },
      { count: pro },
      { count: enterprise },
      { count: admins },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'free'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'pro'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'enterprise'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_admin', true),
    ]);
    
    return {
      total: total || 0,
      free: free || 0,
      pro: pro || 0,
      enterprise: enterprise || 0,
      admins: admins || 0,
    };
  }
  
  const [total, free, pro, enterprise, admins] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { subscription_status: 'free' } }),
    prisma.profile.count({ where: { subscription_status: 'pro' } }),
    prisma.profile.count({ where: { subscription_status: 'enterprise' } }),
    prisma.profile.count({ where: { is_admin: true } }),
  ]);
  
  return { total, free, pro, enterprise, admins };
}
