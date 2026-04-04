/**
 * Data Access Layer (DAL)
 * 
 * Unified data access layer that supports multiple database backends:
 * - Supabase (default)
 * - PostgreSQL (via Prisma)
 * - MySQL (via Prisma)
 * 
 * All data operations should go through this layer to ensure
 * database-agnostic code.
 * 
 * Usage:
 *   import { projects, tasks, columns, users } from '@/lib/dal';
 *   
 *   // Get user's projects
 *   const { data, error } = await projects.getUserProjects(userId);
 *   
 *   // Create a task
 *   const { data: task, error } = await tasks.createTask({ title: 'New Task', column_id: '...' });
 */

// Re-export all DAL modules
export * as projects from './projects';
export * as tasks from './tasks';
export * as columns from './columns';
export * as users from './users';
export * as notifications from './notifications';
export * as comments from './comments';
export * as settings from './settings';

// Re-export types
export type { Project, CreateProjectInput, UpdateProjectInput } from './projects';
export type { Task, CreateTaskInput, UpdateTaskInput } from './tasks';
export type { Column, CreateColumnInput, UpdateColumnInput } from './columns';
export type { Profile, UpdateProfileInput } from './users';

// Re-export database config for checking provider
export { databaseConfig } from '@/lib/database';
