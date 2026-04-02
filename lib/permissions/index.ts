/**
 * Permission System
 * Phase 2: RBAC Implementation
 * 
 * Usage:
 * import { PERMISSIONS, hasPermission, can } from '@/lib/permissions';
 * 
 * // Check single permission
 * if (hasPermission(userPermissions, 'task:create')) { ... }
 * 
 * // Use shortcut
 * if (can.createTask(userPermissions)) { ... }
 */

export * from './constants';
export * from './check';
