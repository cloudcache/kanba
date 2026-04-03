/**
 * Authentication Module
 * Phase 1: Multi-provider authentication support
 * 
 * This module exports all authentication-related functionality:
 * - Types and interfaces
 * - LDAP/LLDAP authentication services
 * - Unified authentication service
 * - Password utilities
 */

// Export types
export * from './types';

// Export LDAP services
export { 
  LDAPAuthService, 
  LLDAPAuthService,
  getLDAPConfig,
} from './ldap';

// Export unified auth service
export { 
  UnifiedAuthService, 
  authService,
  getEnabledProviders,
  isProviderEnabled,
  passwordUtils,
} from './auth-service';
