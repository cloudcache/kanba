/**
 * Permission System
 * Phase 2: Role-based Access Control
 */

// ============================================
// Permission Types
// ============================================

export type Permission =
  // Organization permissions
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'org:manage_members'
  | 'org:manage_roles'
  | 'org:manage_billing'
  | 'org:manage_settings'
  // Workspace permissions
  | 'workspace:create'
  | 'workspace:read'
  | 'workspace:update'
  | 'workspace:delete'
  | 'workspace:manage_members'
  // Project permissions
  | 'project:create'
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'project:manage_members'
  // Task permissions
  | 'task:create'
  | 'task:read'
  | 'task:update'
  | 'task:delete'
  | 'task:assign'
  | 'task:comment'
  // View permissions
  | 'view:create'
  | 'view:read'
  | 'view:update'
  | 'view:delete'
  // Admin permissions
  | 'admin:access'
  | 'admin:users'
  | 'admin:system';

// ============================================
// Preset Roles
// ============================================

export interface PresetRole {
  name: string;
  slug: string;
  description: string;
  permissions: Permission[];
  hierarchyLevel: number;
}

export const PRESET_ROLES: Record<string, PresetRole> = {
  org_owner: {
    name: 'Owner',
    slug: 'owner',
    description: 'Full access to all organization resources',
    permissions: [
      'org:read',
      'org:update',
      'org:delete',
      'org:manage_members',
      'org:manage_roles',
      'org:manage_billing',
      'org:manage_settings',
      'workspace:create',
      'workspace:read',
      'workspace:update',
      'workspace:delete',
      'workspace:manage_members',
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:manage_members',
      'task:create',
      'task:read',
      'task:update',
      'task:delete',
      'task:assign',
      'task:comment',
      'view:create',
      'view:read',
      'view:update',
      'view:delete',
      'admin:access',
      'admin:users',
      'admin:system',
    ],
    hierarchyLevel: 100,
  },
  org_admin: {
    name: 'Admin',
    slug: 'admin',
    description: 'Can manage organization settings and members',
    permissions: [
      'org:read',
      'org:update',
      'org:manage_members',
      'org:manage_settings',
      'workspace:create',
      'workspace:read',
      'workspace:update',
      'workspace:delete',
      'workspace:manage_members',
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:manage_members',
      'task:create',
      'task:read',
      'task:update',
      'task:delete',
      'task:assign',
      'task:comment',
      'view:create',
      'view:read',
      'view:update',
      'view:delete',
      'admin:access',
    ],
    hierarchyLevel: 80,
  },
  workspace_admin: {
    name: 'Workspace Admin',
    slug: 'workspace_admin',
    description: 'Can manage workspace settings and projects',
    permissions: [
      'org:read',
      'workspace:read',
      'workspace:update',
      'workspace:manage_members',
      'project:create',
      'project:read',
      'project:update',
      'project:delete',
      'project:manage_members',
      'task:create',
      'task:read',
      'task:update',
      'task:delete',
      'task:assign',
      'task:comment',
      'view:create',
      'view:read',
      'view:update',
      'view:delete',
    ],
    hierarchyLevel: 60,
  },
  member: {
    name: 'Member',
    slug: 'member',
    description: 'Can view and work on assigned projects',
    permissions: [
      'org:read',
      'workspace:read',
      'project:read',
      'project:update',
      'task:create',
      'task:read',
      'task:update',
      'task:assign',
      'task:comment',
      'view:read',
    ],
    hierarchyLevel: 40,
  },
  viewer: {
    name: 'Viewer',
    slug: 'viewer',
    description: 'Read-only access to projects',
    permissions: [
      'org:read',
      'workspace:read',
      'project:read',
      'task:read',
      'task:comment',
      'view:read',
    ],
    hierarchyLevel: 20,
  },
  guest: {
    name: 'Guest',
    slug: 'guest',
    description: 'Limited access to specific projects',
    permissions: [
      'project:read',
      'task:read',
      'task:comment',
    ],
    hierarchyLevel: 10,
  },
};

// ============================================
// Permission Checking
// ============================================

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if a user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((p) => userPermissions.includes(p));
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((p) => userPermissions.includes(p));
}

/**
 * Get role by slug
 */
export function getRoleBySlug(slug: string): PresetRole | undefined {
  return Object.values(PRESET_ROLES).find((role) => role.slug === slug);
}

/**
 * Check if a role can manage another role (based on hierarchy)
 */
export function canManageRole(
  managerHierarchy: number,
  targetHierarchy: number
): boolean {
  return managerHierarchy > targetHierarchy;
}
