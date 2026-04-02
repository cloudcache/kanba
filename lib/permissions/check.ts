/**
 * Permission Checking Service
 * Phase 2: RBAC Implementation
 */

import { Permission, PERMISSIONS, PRESET_ROLES } from './constants';

// =============================================================================
// Types
// =============================================================================

export interface PermissionContext {
  userId: string;
  organizationId?: string;
  workspaceId?: string;
  projectId?: string;
}

export interface UserPermissions {
  organizationRole?: {
    id: string;
    slug: string;
    permissions: string[];
    hierarchyLevel: number;
  };
  workspaceRole?: {
    id: string;
    slug: string;
    permissions: string[];
    hierarchyLevel: number;
  };
  projectRole?: {
    id: string;
    slug: string;
    permissions: string[];
  };
  effectivePermissions: Permission[];
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  missingPermissions?: Permission[];
}

// =============================================================================
// Permission Checking Functions
// =============================================================================

/**
 * Check if user has a specific permission
 */
export function hasPermission(
  userPermissions: UserPermissions,
  permission: Permission
): boolean {
  return userPermissions.effectivePermissions.includes(permission);
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(
  userPermissions: UserPermissions,
  permissions: Permission[]
): PermissionCheckResult {
  const missingPermissions = permissions.filter(
    (p) => !userPermissions.effectivePermissions.includes(p)
  );

  return {
    allowed: missingPermissions.length === 0,
    missingPermissions:
      missingPermissions.length > 0 ? missingPermissions : undefined,
    reason:
      missingPermissions.length > 0
        ? `Missing permissions: ${missingPermissions.join(', ')}`
        : undefined,
  };
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(
  userPermissions: UserPermissions,
  permissions: Permission[]
): boolean {
  return permissions.some((p) =>
    userPermissions.effectivePermissions.includes(p)
  );
}

/**
 * Check if user can perform an action on a resource
 */
export function canPerform(
  userPermissions: UserPermissions,
  action: string,
  resource: string
): boolean {
  const permission = `${resource}:${action}` as Permission;
  return hasPermission(userPermissions, permission);
}

/**
 * Get all permissions for a resource
 */
export function getResourcePermissions(resource: string): Permission[] {
  return Object.keys(PERMISSIONS).filter((p) =>
    p.startsWith(`${resource}:`)
  ) as Permission[];
}

/**
 * Calculate effective permissions from organization, workspace, and project roles
 * Permissions are inherited: org -> workspace -> project
 */
export function calculateEffectivePermissions(
  orgPermissions: string[] = [],
  workspacePermissions: string[] = [],
  projectPermissions: string[] = []
): Permission[] {
  const combined = new Set<string>([
    ...orgPermissions,
    ...workspacePermissions,
    ...projectPermissions,
  ]);

  // Filter to only valid permissions
  return Array.from(combined).filter(
    (p) => p in PERMISSIONS
  ) as Permission[];
}

/**
 * Check if a role can manage another role based on hierarchy
 */
export function canManageRole(
  managerHierarchyLevel: number,
  targetHierarchyLevel: number
): boolean {
  return managerHierarchyLevel > targetHierarchyLevel;
}

// =============================================================================
// Permission Validation
// =============================================================================

/**
 * Validate if a permission string is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  return permission in PERMISSIONS;
}

/**
 * Validate an array of permissions
 */
export function validatePermissions(permissions: string[]): {
  valid: Permission[];
  invalid: string[];
} {
  const valid: Permission[] = [];
  const invalid: string[] = [];

  for (const p of permissions) {
    if (isValidPermission(p)) {
      valid.push(p);
    } else {
      invalid.push(p);
    }
  }

  return { valid, invalid };
}

/**
 * Get the preset role by slug
 */
export function getPresetRole(slug: string) {
  return PRESET_ROLES[slug as keyof typeof PRESET_ROLES];
}

/**
 * Check if a role slug is a system preset role
 */
export function isSystemRole(slug: string): boolean {
  return slug in PRESET_ROLES;
}

// =============================================================================
// Permission Descriptions
// =============================================================================

/**
 * Get human-readable description for a permission
 */
export function getPermissionDescription(permission: Permission): string {
  return PERMISSIONS[permission] || permission;
}

/**
 * Get permission descriptions for multiple permissions
 */
export function getPermissionDescriptions(
  permissions: Permission[]
): Record<Permission, string> {
  const result: Record<string, string> = {};
  for (const p of permissions) {
    result[p] = getPermissionDescription(p);
  }
  return result as Record<Permission, string>;
}

// =============================================================================
// Resource-based permission shortcuts
// =============================================================================

export const can = {
  // Organization
  viewOrganization: (p: UserPermissions) => hasPermission(p, 'org:read'),
  updateOrganization: (p: UserPermissions) => hasPermission(p, 'org:update'),
  deleteOrganization: (p: UserPermissions) => hasPermission(p, 'org:delete'),
  manageOrgMembers: (p: UserPermissions) =>
    hasAnyPermission(p, [
      'org:members:invite',
      'org:members:remove',
      'org:members:update_role',
    ]),
  manageOrgRoles: (p: UserPermissions) =>
    hasAnyPermission(p, [
      'org:roles:create',
      'org:roles:update',
      'org:roles:delete',
    ]),

  // Workspace
  createWorkspace: (p: UserPermissions) => hasPermission(p, 'workspace:create'),
  viewWorkspace: (p: UserPermissions) => hasPermission(p, 'workspace:read'),
  updateWorkspace: (p: UserPermissions) => hasPermission(p, 'workspace:update'),
  deleteWorkspace: (p: UserPermissions) => hasPermission(p, 'workspace:delete'),

  // Project
  createProject: (p: UserPermissions) => hasPermission(p, 'project:create'),
  viewProject: (p: UserPermissions) => hasPermission(p, 'project:read'),
  updateProject: (p: UserPermissions) => hasPermission(p, 'project:update'),
  deleteProject: (p: UserPermissions) => hasPermission(p, 'project:delete'),
  manageProjectFields: (p: UserPermissions) =>
    hasPermission(p, 'project:fields:manage'),

  // Task
  createTask: (p: UserPermissions) => hasPermission(p, 'task:create'),
  viewTask: (p: UserPermissions) => hasPermission(p, 'task:read'),
  updateTask: (p: UserPermissions) => hasPermission(p, 'task:update'),
  deleteTask: (p: UserPermissions) => hasPermission(p, 'task:delete'),
  assignTask: (p: UserPermissions) => hasPermission(p, 'task:assign'),

  // View
  createView: (p: UserPermissions) => hasPermission(p, 'view:create'),
  updateView: (p: UserPermissions) => hasPermission(p, 'view:update'),
  deleteView: (p: UserPermissions) => hasPermission(p, 'view:delete'),
};
