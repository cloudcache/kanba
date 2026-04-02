/**
 * Unified Authentication Service
 * Phase 1: Multi-provider authentication support
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import type {
  AuthProvider,
  AuthResult,
  AuthUser,
  LDAPCredentials,
  LocalCredentials,
  AuthConfig,
} from './types';
import { LDAPAuthService, LLDAPAuthService } from './ldap';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get enabled authentication providers from environment
 */
export function getEnabledProviders(): AuthProvider[] {
  const providers: AuthProvider[] = ['supabase']; // Supabase is always enabled

  if (LDAPAuthService.isEnabled()) {
    providers.push('ldap');
  }

  if (LLDAPAuthService.isEnabled()) {
    providers.push('lldap');
  }

  if (process.env.LOCAL_AUTH_ENABLED === 'true') {
    providers.push('local');
  }

  return providers;
}

/**
 * Check if a specific provider is enabled
 */
export function isProviderEnabled(provider: AuthProvider): boolean {
  return getEnabledProviders().includes(provider);
}

/**
 * Unified Authentication Service
 */
export class UnifiedAuthService {
  private enabledProviders: AuthProvider[];

  constructor() {
    this.enabledProviders = getEnabledProviders();
  }

  /**
   * Authenticate with the specified provider
   */
  async authenticate(
    provider: AuthProvider,
    credentials: LDAPCredentials | LocalCredentials
  ): Promise<AuthResult> {
    if (!this.enabledProviders.includes(provider)) {
      return {
        success: false,
        error: `Provider ${provider} is not enabled`,
        errorCode: 'PROVIDER_NOT_ENABLED',
      };
    }

    switch (provider) {
      case 'ldap':
        return this.authenticateLDAP(credentials as LDAPCredentials);
      case 'lldap':
        return this.authenticateLLDAP(credentials as LDAPCredentials);
      case 'supabase':
        return this.authenticateSupabase(credentials as LocalCredentials);
      case 'local':
        return this.authenticateLocal(credentials as LocalCredentials);
      default:
        return {
          success: false,
          error: 'Unknown provider',
          errorCode: 'UNKNOWN_ERROR',
        };
    }
  }

  /**
   * Authenticate with LDAP
   */
  private async authenticateLDAP(credentials: LDAPCredentials): Promise<AuthResult> {
    try {
      const ldapService = new LDAPAuthService();
      return await ldapService.authenticate(credentials);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'LDAP authentication failed',
        errorCode: 'LDAP_CONNECTION_ERROR',
      };
    }
  }

  /**
   * Authenticate with LLDAP
   */
  private async authenticateLLDAP(credentials: LDAPCredentials): Promise<AuthResult> {
    try {
      const lldapService = new LLDAPAuthService();
      return await lldapService.authenticate(credentials);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'LLDAP authentication failed',
        errorCode: 'LDAP_CONNECTION_ERROR',
      };
    }
  }

  /**
   * Authenticate with Supabase
   */
  private async authenticateSupabase(credentials: LocalCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email!,
          fullName: data.user.user_metadata?.full_name,
          avatarUrl: data.user.user_metadata?.avatar_url,
          authProvider: 'supabase',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Supabase authentication failed',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Authenticate with local credentials (database-backed)
   * This is for deployments without Supabase
   */
  private async authenticateLocal(credentials: LocalCredentials): Promise<AuthResult> {
    try {
      // Import Prisma dynamically to avoid issues
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Find user by email
      const profile = await prisma.profile.findUnique({
        where: { email: credentials.email },
      });

      if (!profile) {
        return {
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Note: For local auth, we would need a separate password table
      // This is a placeholder implementation
      // In production, you would store hashed passwords separately

      return {
        success: true,
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name || undefined,
          avatarUrl: profile.avatar_url || undefined,
          authProvider: 'local',
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Local authentication failed',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Sync authenticated user to local database
   */
  async syncUserToDatabase(user: AuthUser): Promise<AuthUser> {
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      // Check if user exists
      const existing = await prisma.profile.findFirst({
        where: {
          OR: [
            { id: user.id },
            { email: user.email },
            { external_id: user.externalId },
          ],
        },
      });

      if (existing) {
        // Update existing user
        const updated = await prisma.profile.update({
          where: { id: existing.id },
          data: {
            full_name: user.fullName || existing.full_name,
            avatar_url: user.avatarUrl || existing.avatar_url,
            auth_provider: user.authProvider,
            external_id: user.externalId,
            ldap_dn: user.metadata?.ldapDN as string,
            updated_at: new Date(),
          },
        });

        return {
          ...user,
          id: updated.id,
        };
      } else {
        // Create new user
        const created = await prisma.profile.create({
          data: {
            id: user.id.startsWith('ldap_') || user.id.startsWith('lldap_')
              ? undefined // Let Prisma generate ID
              : user.id,
            email: user.email,
            full_name: user.fullName,
            avatar_url: user.avatarUrl,
            auth_provider: user.authProvider,
            external_id: user.externalId,
            ldap_dn: user.metadata?.ldapDN as string,
          },
        });

        return {
          ...user,
          id: created.id,
        };
      }
    } catch (error) {
      console.error('Failed to sync user to database:', error);
      return user;
    }
  }

  /**
   * Get available authentication methods for UI
   */
  getAvailableMethods(): Array<{
    provider: AuthProvider;
    name: string;
    icon: string;
    type: 'oauth' | 'credentials';
  }> {
    const methods: Array<{
      provider: AuthProvider;
      name: string;
      icon: string;
      type: 'oauth' | 'credentials';
    }> = [];

    if (this.enabledProviders.includes('supabase')) {
      methods.push({
        provider: 'supabase',
        name: 'Email & Password',
        icon: 'mail',
        type: 'credentials',
      });
    }

    if (this.enabledProviders.includes('ldap')) {
      methods.push({
        provider: 'ldap',
        name: 'Enterprise (LDAP)',
        icon: 'building',
        type: 'credentials',
      });
    }

    if (this.enabledProviders.includes('lldap')) {
      methods.push({
        provider: 'lldap',
        name: 'Enterprise (LLDAP)',
        icon: 'building',
        type: 'credentials',
      });
    }

    if (this.enabledProviders.includes('local')) {
      methods.push({
        provider: 'local',
        name: 'Local Account',
        icon: 'user',
        type: 'credentials',
      });
    }

    return methods;
  }
}

/**
 * Password utilities for local authentication
 */
export const passwordUtils = {
  /**
   * Hash a password
   */
  async hash(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  },

  /**
   * Compare a password with a hash
   */
  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Validate password strength
   */
  validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10);

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters`);
    }

    if (process.env.PASSWORD_REQUIRE_UPPERCASE === 'true' && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (process.env.PASSWORD_REQUIRE_LOWERCASE === 'true' && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (process.env.PASSWORD_REQUIRE_NUMBER === 'true' && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (process.env.PASSWORD_REQUIRE_SPECIAL === 'true' && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};

// Export singleton instance
export const authService = new UnifiedAuthService();
