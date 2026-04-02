/**
 * Authentication Types
 * Phase 1: Multi-provider authentication support
 */

// Authentication providers
export type AuthProvider = 'supabase' | 'ldap' | 'lldap' | 'local';

// Authentication result
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  errorCode?: AuthErrorCode;
}

// Authenticated user
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  authProvider: AuthProvider;
  externalId?: string;
  groups?: string[];
  metadata?: Record<string, unknown>;
}

// Authentication error codes
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'USER_DISABLED'
  | 'USER_LOCKED'
  | 'PASSWORD_EXPIRED'
  | 'LDAP_CONNECTION_ERROR'
  | 'LDAP_BIND_ERROR'
  | 'LDAP_SEARCH_ERROR'
  | 'SESSION_EXPIRED'
  | 'INVALID_TOKEN'
  | 'PROVIDER_NOT_ENABLED'
  | 'UNKNOWN_ERROR';

// LDAP Configuration
export interface LDAPConfig {
  url: string;
  bindDN: string;
  bindPassword: string;
  searchBase: string;
  searchFilter: string;
  tlsEnabled: boolean;
  tlsOptions?: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
  userAttributes: {
    uid: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    memberOf?: string;
  };
  groupMappings?: LDAPGroupMapping[];
  connectionTimeout?: number;
  idleTimeout?: number;
}

// LDAP Group to Role Mapping
export interface LDAPGroupMapping {
  ldapGroup: string;       // LDAP Group DN
  roleId: string;          // System Role ID
  organizationId?: string; // Optional: map to specific org
  autoCreateOrg?: boolean; // Auto-create org if not exists
}

// LLDAP (Light LDAP) Configuration
export interface LLDAPConfig {
  url: string;
  adminUsername: string;
  adminPassword: string;
  baseDN: string;
  userSearchBase?: string;
  groupSearchBase?: string;
  tlsEnabled: boolean;
}

// Local Authentication Configuration
export interface LocalAuthConfig {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSpecial: boolean;
  sessionDuration: number; // in seconds
  maxFailedAttempts: number;
  lockoutDuration: number; // in seconds
}

// Combined Authentication Configuration
export interface AuthConfig {
  enabledProviders: AuthProvider[];
  defaultProvider: AuthProvider;
  ldap?: LDAPConfig;
  lldap?: LLDAPConfig;
  local?: LocalAuthConfig;
  sessionConfig: {
    cookieName: string;
    cookieMaxAge: number;
    cookieSecure: boolean;
    cookieHttpOnly: boolean;
    cookieSameSite: 'strict' | 'lax' | 'none';
  };
}

// Credentials for authentication
export interface LDAPCredentials {
  username: string;
  password: string;
}

export interface LocalCredentials {
  email: string;
  password: string;
}

export interface OAuthCredentials {
  provider: 'google' | 'github';
  accessToken: string;
  refreshToken?: string;
}

// User session
export interface UserSession {
  id: string;
  userId: string;
  authProvider: AuthProvider;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// LDAP User Entry (raw from LDAP server)
export interface LDAPUserEntry {
  dn: string;
  uid: string;
  mail?: string;
  cn?: string;
  displayName?: string;
  sn?: string;
  givenName?: string;
  memberOf?: string[];
  jpegPhoto?: Buffer;
  thumbnailPhoto?: Buffer;
  [key: string]: unknown;
}

// User sync result
export interface UserSyncResult {
  created: boolean;
  updated: boolean;
  user: AuthUser;
}
