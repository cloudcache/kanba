import { PrismaClient } from '@prisma/client';

// Initialize Prisma client singleton for MySQL
const globalForPrisma = globalThis as unknown as {
  prismaMysql: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prismaMysql ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.MYSQL_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaMysql = prisma;
}

// Query builder class to mimic Supabase's query interface for MySQL
class MysqlQueryBuilder<T> {
  private table: string;
  private whereConditions: Record<string, any> = {};
  private orderByConditions: Record<string, 'asc' | 'desc'>[] = [];
  private limitValue?: number;
  private offsetValue?: number;

  constructor(table: string) {
    this.table = table;
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

  select(columns?: string): this {
    return this;
  }

  single(): Promise<{ data: T | null; error: any }> {
    return this.execute(true) as Promise<{ data: T | null; error: any }>;
  }

  maybeSingle(): Promise<{ data: T | null; error: any }> {
    return this.execute(true) as Promise<{ data: T | null; error: any }>;
  }

  async then(resolve: (value: { data: T[] | null; error: any }) => void): Promise<void> {
    const result = await this.execute(false);
    resolve(result as { data: T[] | null; error: any });
  }

  async execute(single = false): Promise<{ data: T | T[] | null; error: any }> {
    try {
      const orderBy = this.orderByConditions.length > 0 ? this.orderByConditions : undefined;

      let result;
      if (single) {
        result = await (prisma as any)[this.table].findFirst({
          where: this.whereConditions,
          orderBy,
        });
        return { data: result, error: null };
      } else {
        result = await (prisma as any)[this.table].findMany({
          where: this.whereConditions,
          orderBy,
          take: this.limitValue,
          skip: this.offsetValue,
        });
        return { data: result, error: null };
      }
    } catch (error) {
      console.error('MySQL query error:', error);
      return { data: null, error };
    }
  }
}

// Table interface
function createTableInterface<T>(tableName: string) {
  return {
    select: (columns?: string) => new MysqlQueryBuilder<T>(tableName),
    
    insert: async (data: Partial<T> | Partial<T>[]) => {
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
        console.error('MySQL insert error:', error);
        return { data: null, error };
      }
    },

    update: (data: Partial<T>) => {
      const builder = new MysqlQueryBuilder<T>(tableName);
      (builder as any)._updateData = data;
      (builder as any).execute = async function() {
        try {
          const result = await (prisma as any)[tableName].updateMany({
            where: this.whereConditions,
            data: this._updateData,
          });
          return { data: result, error: null };
        } catch (error) {
          console.error('MySQL update error:', error);
          return { data: null, error };
        }
      };
      return builder;
    },

    delete: () => {
      const builder = new MysqlQueryBuilder<T>(tableName);
      (builder as any).execute = async function() {
        try {
          const result = await (prisma as any)[tableName].deleteMany({
            where: this.whereConditions,
          });
          return { data: result, error: null };
        } catch (error) {
          console.error('MySQL delete error:', error);
          return { data: null, error };
        }
      };
      return builder;
    },

    upsert: async (data: Partial<T>, options?: { onConflict?: string }) => {
      try {
        const conflictField = options?.onConflict || 'id';
        const result = await (prisma as any)[tableName].upsert({
          where: { [conflictField]: (data as any)[conflictField] },
          update: data,
          create: data,
        });
        return { data: result, error: null };
      } catch (error) {
        console.error('MySQL upsert error:', error);
        return { data: null, error };
      }
    },
  };
}

// MySQL adapter that mimics Supabase client interface
export function createMysqlClient() {
  return {
    from: <T = any>(table: string) => createTableInterface<T>(table),
    
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error('Use external auth provider') }),
      signUp: async () => ({ data: null, error: new Error('Use external auth provider') }),
      signOut: async () => ({ error: null }),
    },

    prisma,
  };
}

export type MysqlClient = ReturnType<typeof createMysqlClient>;
