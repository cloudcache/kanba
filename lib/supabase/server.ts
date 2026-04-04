import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { databaseConfig } from '@/lib/database';
import { verify } from 'jsonwebtoken';

/**
 * Alias for createServerSupabaseClientWithAuth for convenience
 * Used by API routes that import { createClient } from '@/lib/supabase/server'
 */
export async function createClient() {
  return createServerSupabaseClientWithAuth();
}

/**
 * Create a Supabase client for server-side operations
 * This client has access to the service role key for admin operations
 */
export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client that uses the user's session
 * For authenticated API routes
 */
export async function createServerSupabaseClientWithAuth() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  const cookieStore = await cookies();
  
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        cookie: cookieStore.toString(),
      },
    },
  });
}

/**
 * Get the current authenticated user from the request
 * Supports multiple auth providers (Supabase, Local JWT, LDAP)
 */
export async function getServerUser() {
  const authProvider = process.env.AUTH_PROVIDER || 'supabase';
  
  // For Supabase auth
  if (authProvider === 'supabase' && databaseConfig.isSupabase) {
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return user;
  }
  
  // For local database or LDAP auth - use JWT session
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me';
    const decoded = verify(sessionToken, jwtSecret) as {
      id: string;
      email: string;
      full_name?: string;
      avatar_url?: string;
      is_admin?: boolean;
    };
    
    return {
      id: decoded.id,
      email: decoded.email,
      user_metadata: {
        full_name: decoded.full_name,
        avatar_url: decoded.avatar_url,
      },
    };
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Get server database client based on configuration
 * Returns the appropriate client for data operations
 */
export async function getServerDb() {
  if (databaseConfig.isSupabase) {
    return createServerSupabaseClientWithAuth();
  }
  
  // For non-Supabase databases, return a client wrapper
  // that provides a similar API surface
  const { db } = await import('@/lib/database');
  return db;
}
