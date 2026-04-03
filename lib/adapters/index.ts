/**
 * Database Adapters
 * 
 * This module provides a unified interface for different database backends.
 * Supported: Supabase (default), PostgreSQL (via Prisma), MySQL (via Prisma)
 * 
 * Configuration:
 * Set DATABASE_PROVIDER environment variable to one of:
 * - "supabase" (default)
 * - "postgresql" 
 * - "mysql"
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createPostgresClient, type PostgresClient } from './postgres';
import { createMysqlClient, type MysqlClient } from './mysql';

export type DatabaseProvider = 'supabase' | 'postgresql' | 'mysql';

// Get the database provider from environment
export function getDatabaseProvider(): DatabaseProvider {
  const provider = process.env.DATABASE_PROVIDER?.toLowerCase() || 'supabase';
  
  if (provider === 'postgresql' || provider === 'postgres' || provider === 'pg') {
    return 'postgresql';
  }
  
  if (provider === 'mysql' || provider === 'mariadb') {
    return 'mysql';
  }
  
  return 'supabase';
}

// Supabase client type
type SupabaseClient = ReturnType<typeof createSupabaseClient>;

// Unified client type
export type DatabaseClient = SupabaseClient | PostgresClient | MysqlClient;

// Create the appropriate database client based on configuration
export function createDatabaseClient(): DatabaseClient {
  const provider = getDatabaseProvider();
  
  switch (provider) {
    case 'postgresql':
      console.log('[Database] Using PostgreSQL adapter');
      return createPostgresClient();
      
    case 'mysql':
      console.log('[Database] Using MySQL adapter');
      return createMysqlClient();
      
    case 'supabase':
    default:
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }
      
      console.log('[Database] Using Supabase');
      return createSupabaseClient(supabaseUrl, supabaseKey);
  }
}

// Singleton instance
let dbClient: DatabaseClient | null = null;

export function getDatabase(): DatabaseClient {
  if (!dbClient) {
    dbClient = createDatabaseClient();
  }
  return dbClient;
}

// Re-export adapter-specific helpers
export { postgresHelpers } from './postgres';
export { createPostgresClient } from './postgres';
export { createMysqlClient } from './mysql';
