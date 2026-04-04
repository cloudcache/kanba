/**
 * System Settings Data Access Layer
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface SystemSetting {
  key: string;
  value: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  project_limit: number;
  task_limit: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

// ============================================
// System Settings
// ============================================

export async function getSetting(key: string): Promise<{ data: string | null; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error) return { data: null, error };
    return { data: data?.value || null, error: null };
  }
  
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return { data: setting?.value || null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllSettings(): Promise<{ data: Record<string, any> | null; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value');
    
    if (error) return { data: null, error };
    
    const settings: Record<string, any> = {};
    for (const row of data || []) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return { data: settings, error: null };
  }
  
  try {
    const rows = await prisma.systemSetting.findMany();
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return { data: settings, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function setSetting(key: string, value: any): Promise<{ error: any }> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (databaseConfig.isSupabase) {
    const { error } = await supabase
      .from('system_settings')
      .upsert(
        { key, value: stringValue, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    return { error };
  }
  
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue, updated_at: new Date() },
      create: { key, value: stringValue },
    });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function setSettings(settings: Record<string, any>): Promise<{ error: any }> {
  for (const [key, value] of Object.entries(settings)) {
    const { error } = await setSetting(key, value);
    if (error) return { error };
  }
  return { error: null };
}

// ============================================
// Subscription Plans
// ============================================

export async function getActivePlans(): Promise<{ data: SubscriptionPlan[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price');
    
    if (error) return { data: null, error };
    
    // Parse features JSON
    const plans = (data || []).map(plan => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'),
    }));
    
    return { data: plans as SubscriptionPlan[], error: null };
  }
  
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { is_active: true },
      orderBy: { price: 'asc' },
    });
    return { data: plans as SubscriptionPlan[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getAllPlans(): Promise<{ data: SubscriptionPlan[] | null; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('price');
    
    if (error) return { data: null, error };
    
    const plans = (data || []).map(plan => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]'),
    }));
    
    return { data: plans as SubscriptionPlan[], error: null };
  }
  
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
    return { data: plans as SubscriptionPlan[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function getPlanById(id: string): Promise<{ data: SubscriptionPlan | null; error: any }> {
  if (databaseConfig.isSupabase) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return { data: null, error };
    
    return {
      data: {
        ...data,
        features: Array.isArray(data.features) ? data.features : JSON.parse(data.features || '[]'),
      } as SubscriptionPlan,
      error: null,
    };
  }
  
  try {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
    return { data: plan as SubscriptionPlan | null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function updatePlan(
  id: string,
  data: Partial<Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ data: SubscriptionPlan | null; error: any }> {
  const updateData = {
    ...data,
    features: data.features ? JSON.stringify(data.features) : undefined,
  };
  
  if (databaseConfig.isSupabase) {
    return supabase
      .from('subscription_plans')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
  }
  
  try {
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { ...updateData, updated_at: new Date() },
    });
    return { data: plan as SubscriptionPlan, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
