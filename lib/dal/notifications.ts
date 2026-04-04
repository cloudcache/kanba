/**
 * Notifications Data Access Layer
 */

import { prisma, databaseConfig, supabase } from '@/lib/database';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  read: boolean;
  link: string | null;
  created_at: Date | string;
}

export interface CreateNotificationInput {
  user_id: string;
  title: string;
  message?: string;
  type?: string;
  link?: string;
}

export async function getNotificationsByUserId(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number }
): Promise<{ data: Notification[] | null; error: any }> {
  const { unreadOnly = false, limit = 50 } = options || {};
  
  if (databaseConfig.isSupabase) {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);
    
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    return query.order('created_at', { ascending: false }).limit(limit);
  }
  
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        user_id: userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return { data: notifications as Notification[], error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function createNotification(input: CreateNotificationInput): Promise<{ data: Notification | null; error: any }> {
  if (databaseConfig.isSupabase) {
    return supabase
      .from('notifications')
      .insert({ ...input, type: input.type || 'info' })
      .select()
      .single();
  }
  
  try {
    const notification = await prisma.notification.create({
      data: { ...input, type: input.type || 'info' },
    });
    return { data: notification as Notification, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export async function markAsRead(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    return { error };
  }
  
  try {
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function markAllAsRead(userId: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    return { error };
  }
  
  try {
    await prisma.notification.updateMany({
      where: { user_id: userId, read: false },
      data: { read: true },
    });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function deleteNotification(id: string): Promise<{ error: any }> {
  if (databaseConfig.isSupabase) {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    return { error };
  }
  
  try {
    await prisma.notification.delete({ where: { id } });
    return { error: null };
  } catch (error) {
    return { error };
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (databaseConfig.isSupabase) {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);
    return count || 0;
  }
  
  return prisma.notification.count({
    where: { user_id: userId, read: false },
  });
}
