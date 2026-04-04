/**
 * Unified Database Module
 * 
 * Supports multiple database backends:
 * - Supabase (default)
 * - PostgreSQL (via Prisma)
 * - MySQL (via Prisma)
 * 
 * Set DATABASE_PROVIDER env var to: "supabase" | "postgresql" | "mysql"
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import type { Database } from './supabase';

// ============================================
// Database Provider Configuration
// ============================================

export type DatabaseProvider = 'supabase' | 'postgresql' | 'mysql';

const DATABASE_PROVIDER = (process.env.DATABASE_PROVIDER || 'supabase').toLowerCase() as DatabaseProvider;

export const databaseConfig = {
  provider: DATABASE_PROVIDER,
  isSupabase: DATABASE_PROVIDER === 'supabase',
  isPostgres: DATABASE_PROVIDER === 'postgresql' || DATABASE_PROVIDER === 'postgres',
  isMysql: DATABASE_PROVIDER === 'mysql' || DATABASE_PROVIDER === 'mariadb',
};

// ============================================
// Prisma Client (for PostgreSQL/MySQL)
// ============================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Only initialize Prisma if we're using PostgreSQL/MySQL and DATABASE_URL is set
function getPrismaClient(): PrismaClient | null {
  if (!databaseConfig.isPostgres && !databaseConfig.isMysql) {
    return null;
  }
  
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set, Prisma client not initialized');
    return null;
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Lazy-loaded Prisma client
export const prisma = databaseConfig.isSupabase ? null : getPrismaClient();

// ============================================
// Supabase Client
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey
);

// ============================================
// Unified Database Interface
// ============================================

export interface QueryBuilder<T> {
  eq(column: string, value: any): QueryBuilder<T>;
  neq(column: string, value: any): QueryBuilder<T>;
  gt(column: string, value: any): QueryBuilder<T>;
  gte(column: string, value: any): QueryBuilder<T>;
  lt(column: string, value: any): QueryBuilder<T>;
  lte(column: string, value: any): QueryBuilder<T>;
  in(column: string, values: any[]): QueryBuilder<T>;
  like(column: string, value: string): QueryBuilder<T>;
  ilike(column: string, value: string): QueryBuilder<T>;
  is(column: string, value: null | boolean): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<{ data: T | null; error: any }>;
  maybeSingle(): Promise<{ data: T | null; error: any }>;
  then(resolve: (value: { data: T[] | null; error: any }) => void): Promise<void>;
}

// ============================================
// Prisma Query Builder (PostgreSQL/MySQL)
// ============================================

class PrismaQueryBuilder<T> implements QueryBuilder<T> {
  private tableName: string;
  private whereConditions: Record<string, any> = {};
  private orderByConditions: Record<string, 'asc' | 'desc'>[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(column: string, value: any): this {
    this.whereConditions[column] = value;
    return this;
  }

  neq(column: string, value: any): this {
    this.whereConditions[column] = { not: value };
    return this;
  }

  gt(column: string, value: any): this {
    this.whereConditions[column] = { gt: value };
    return this;
  }

  gte(column: string, value: any): this {
    this.whereConditions[column] = { gte: value };
    return this;
  }

  lt(column: string, value: any): this {
    this.whereConditions[column] = { lt: value };
    return this;
  }

  lte(column: string, value: any): this {
    this.whereConditions[column] = { lte: value };
    return this;
  }

  in(column: string, values: any[]): this {
    this.whereConditions[column] = { in: values };
    return this;
  }

  like(column: string, value: string): this {
    this.whereConditions[column] = { contains: value.replace(/%/g, '') };
    return this;
  }

  ilike(column: string, value: string): this {
    this.whereConditions[column] = { contains: value.replace(/%/g, ''), mode: 'insensitive' };
    return this;
  }

  is(column: string, value: null | boolean): this {
    this.whereConditions[column] = value;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderByConditions.push({ [column]: options?.ascending === false ? 'desc' : 'asc' });
    return this;
  }

  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number): this {
    this.offsetValue = from;
    this.limitValue = to - from + 1;
    return this;
  }

  async single(): Promise<{ data: T | null; error: any }> {
    try {
      const orderBy = this.orderByConditions.length > 0 ? this.orderByConditions : undefined;
      const result = await (prisma as any)[this.tableName].findFirst({
        where: this.whereConditions,
        orderBy,
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async maybeSingle(): Promise<{ data: T | null; error: any }> {
    return this.single();
  }

  async then(resolve: (value: { data: T[] | null; error: any }) => void): Promise<void> {
    try {
      const orderBy = this.orderByConditions.length > 0 ? this.orderByConditions : undefined;
      const result = await (prisma as any)[this.tableName].findMany({
        where: this.whereConditions,
        orderBy,
        take: this.limitValue,
        skip: this.offsetValue,
      });
      resolve({ data: result, error: null });
    } catch (error) {
      resolve({ data: null, error });
    }
  }
}

// ============================================
// Unified Database Client
// ============================================

function createPrismaTableInterface(tableName: string) {
  return {
    select: (columns?: string) => new PrismaQueryBuilder(tableName),
    
    insert: async (data: any | any[]) => {
      try {
        const dataArray = Array.isArray(data) ? data : [data];
        if (dataArray.length === 1) {
          const result = await (prisma as any)[tableName].create({ data: dataArray[0] });
          return { data: result, error: null };
        } else {
          const result = await (prisma as any)[tableName].createMany({ data: dataArray });
          return { data: result, error: null };
        }
      } catch (error) {
        return { data: null, error };
      }
    },

    update: (data: any) => {
      const builder = new PrismaQueryBuilder(tableName);
      (builder as any)._updateData = data;
      const originalSingle = builder.single.bind(builder);
      builder.single = async () => {
        try {
          const result = await (prisma as any)[tableName].updateMany({
            where: (builder as any).whereConditions,
            data: (builder as any)._updateData,
          });
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
      return builder;
    },

    delete: () => {
      const builder = new PrismaQueryBuilder(tableName);
      const originalSingle = builder.single.bind(builder);
      builder.single = async () => {
        try {
          const result = await (prisma as any)[tableName].deleteMany({
            where: (builder as any).whereConditions,
          });
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error };
        }
      };
      return builder;
    },

    upsert: async (data: any, options?: { onConflict?: string }) => {
      try {
        const conflictField = options?.onConflict || 'id';
        const result = await (prisma as any)[tableName].upsert({
          where: { [conflictField]: data[conflictField] },
          update: data,
          create: data,
        });
        return { data: result, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  };
}

// Prisma-based client
const prismaClient = {
  from: (table: string) => createPrismaTableInterface(table),
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: null, error: new Error('Use external auth for PostgreSQL/MySQL') }),
    signUp: async () => ({ data: null, error: new Error('Use external auth for PostgreSQL/MySQL') }),
    signOut: async () => ({ error: null }),
  },
};

// ============================================
// Exports
// ============================================

// Get the appropriate database client based on provider
export function getDatabase() {
  if (databaseConfig.isPostgres || databaseConfig.isMysql) {
    return prismaClient;
  }
  return supabase;
}

// Unified db export - use this in most cases
export const db = databaseConfig.isSupabase ? supabase : prismaClient;

// Helper functions
export const dbHelpers = {
  async getProjectWithDetails(projectId: string) {
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
    } else {
      try {
        if (!prisma) {
          return { data: null, error: new Error('Prisma client not initialized') };
        }
        const project = await (prisma as PrismaClient).project.findUnique({
          where: { id: projectId },
          include: {
            columns: {
              include: { tasks: { orderBy: { position: 'asc' } } },
              orderBy: { position: 'asc' },
            },
          },
        });
        return { data: project, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  async getUserProjects(userId: string) {
    if (databaseConfig.isSupabase) {
      return supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    } else {
      try {
        if (!prisma) {
          return { data: null, error: new Error('Prisma client not initialized') };
        }
        const projects = await (prisma as PrismaClient).project.findMany({
          where: { user_id: userId },
          orderBy: { created_at: 'desc' },
        });
        return { data: projects, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  async getAssignedTasks(userId: string, limit = 10) {
    if (databaseConfig.isSupabase) {
      return supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    } else {
      try {
        if (!prisma) {
          return { data: null, error: new Error('Prisma client not initialized') };
        }
        const tasks = await (prisma as PrismaClient).task.findMany({
          where: { assigned_to: userId },
          orderBy: { created_at: 'desc' },
          take: limit,
        });
        return { data: tasks, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },
};

// Utility exports
export const getDatabaseProvider = () => DATABASE_PROVIDER;
export const isPostgresAvailable = () => databaseConfig.isPostgres;
export const isMysqlAvailable = () => databaseConfig.isMysql;
export const isSupabaseAvailable = () => databaseConfig.isSupabase;

// Type exports
export type { Database };
