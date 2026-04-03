/**
 * API Key Service
 * Phase 5: Manage API keys for external access
 */

import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/database';

// =============================================================================
// Types
// =============================================================================

export interface ApiKey {
  id: string;
  organizationId?: string;
  userId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
}

export interface CreateApiKeyInput {
  userId: string;
  organizationId?: string;
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  secretKey: string; // Only returned on creation
}

// Available API scopes
export const API_SCOPES = {
  // Read scopes
  'read:projects': 'Read projects',
  'read:tasks': 'Read tasks',
  'read:members': 'Read members',
  'read:comments': 'Read comments',
  
  // Write scopes
  'write:projects': 'Create and update projects',
  'write:tasks': 'Create and update tasks',
  'write:members': 'Manage members',
  'write:comments': 'Create comments',
  
  // Delete scopes
  'delete:projects': 'Delete projects',
  'delete:tasks': 'Delete tasks',
  
  // Admin scopes
  'admin:organization': 'Full organization access',
  'admin:webhooks': 'Manage webhooks',
} as const;

export type ApiScope = keyof typeof API_SCOPES;

// =============================================================================
// Service Implementation
// =============================================================================

export class ApiKeyService {
  private static readonly KEY_LENGTH = 32;
  private static readonly PREFIX_LENGTH = 8;

  /**
   * Generate a new API key
   */
  async create(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    // Generate random key
    const rawKey = randomBytes(ApiKeyService.KEY_LENGTH).toString('hex');
    const keyPrefix = rawKey.slice(0, ApiKeyService.PREFIX_LENGTH);
    const keyHash = this.hashKey(rawKey);

    // Format key as: kanba_<prefix>_<rest>
    const secretKey = `kanba_${rawKey}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        user_id: input.userId,
        organization_id: input.organizationId,
        name: input.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        scopes: input.scopes || [],
        rate_limit: input.rateLimit || 1000,
        expires_at: input.expiresAt,
      },
    });

    return {
      apiKey: this.toApiKey(apiKey),
      secretKey,
    };
  }

  /**
   * Validate an API key and return its metadata
   */
  async validate(key: string): Promise<ApiKey | null> {
    // Parse key format: kanba_<fullkey>
    if (!key.startsWith('kanba_')) {
      return null;
    }

    const rawKey = key.slice(6);
    const keyHash = this.hashKey(rawKey);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key_hash: keyHash },
    });

    if (!apiKey) {
      return null;
    }

    // Check if revoked
    if (apiKey.revoked_at) {
      return null;
    }

    // Check if expired
    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { last_used_at: new Date() },
    });

    return this.toApiKey(apiKey);
  }

  /**
   * Check if an API key has a specific scope
   */
  hasScope(apiKey: ApiKey, scope: ApiScope): boolean {
    // Admin scope grants all permissions
    if (apiKey.scopes.includes('admin:organization')) {
      return true;
    }
    return apiKey.scopes.includes(scope);
  }

  /**
   * List API keys for a user or organization
   */
  async list(userId: string, organizationId?: string): Promise<ApiKey[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        user_id: userId,
        ...(organizationId && { organization_id: organizationId }),
        revoked_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    return apiKeys.map(this.toApiKey);
  }

  /**
   * Revoke an API key
   */
  async revoke(id: string, userId: string): Promise<void> {
    await prisma.apiKey.updateMany({
      where: {
        id,
        user_id: userId,
        revoked_at: null,
      },
      data: { revoked_at: new Date() },
    });
  }

  /**
   * Delete an API key
   */
  async delete(id: string, userId: string): Promise<void> {
    await prisma.apiKey.deleteMany({
      where: {
        id,
        user_id: userId,
      },
    });
  }

  /**
   * Hash an API key for storage
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Convert database model to API type
   */
  private toApiKey(model: any): ApiKey {
    return {
      id: model.id,
      organizationId: model.organization_id,
      userId: model.user_id,
      name: model.name,
      keyPrefix: model.key_prefix,
      scopes: model.scopes,
      rateLimit: model.rate_limit,
      lastUsedAt: model.last_used_at,
      expiresAt: model.expires_at,
      revokedAt: model.revoked_at,
      createdAt: model.created_at,
    };
  }
}

export const apiKeyService = new ApiKeyService();
