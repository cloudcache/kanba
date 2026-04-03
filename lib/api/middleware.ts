/**
 * API Middleware
 * Phase 5: Authentication and rate limiting for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService, ApiKey, ApiScope } from './api-key-service';

// =============================================================================
// Types
// =============================================================================

export interface ApiContext {
  apiKey: ApiKey;
  userId: string;
  organizationId?: string;
}

export type ApiHandler = (
  req: NextRequest,
  context: ApiContext
) => Promise<NextResponse>;

// =============================================================================
// Rate Limiting
// =============================================================================

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(apiKeyId: string, limit: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  let entry = rateLimitStore.get(apiKeyId);
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(apiKeyId, entry);
  }
  
  entry.count++;
  
  return {
    allowed: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

// =============================================================================
// Middleware Functions
// =============================================================================

/**
 * Authenticate API request using API key
 */
export async function authenticateApiKey(req: NextRequest): Promise<ApiKey | null> {
  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  // Support both "Bearer <key>" and "ApiKey <key>" formats
  const parts = authHeader.split(' ');
  if (parts.length !== 2) {
    return null;
  }
  
  const [scheme, key] = parts;
  if (!['Bearer', 'ApiKey'].includes(scheme)) {
    return null;
  }
  
  return apiKeyService.validate(key);
}

/**
 * Create authenticated API handler with scope checking
 */
export function withApiAuth(
  handler: ApiHandler,
  options?: {
    scopes?: ApiScope[];
  }
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    // Authenticate
    const apiKey = await authenticateApiKey(req);
    
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
        },
        { status: 401 }
      );
    }
    
    // Check scopes
    if (options?.scopes) {
      for (const scope of options.scopes) {
        if (!apiKeyService.hasScope(apiKey, scope)) {
          return NextResponse.json(
            {
              error: 'Forbidden',
              message: `Missing required scope: ${scope}`,
            },
            { status: 403 }
          );
        }
      }
    }
    
    // Check rate limit
    const rateLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(apiKey.rateLimit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }
    
    // Create context
    const context: ApiContext = {
      apiKey,
      userId: apiKey.userId,
      organizationId: apiKey.organizationId,
    };
    
    // Call handler
    const response = await handler(req, context);
    
    // Add rate limit headers to response
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', String(apiKey.rateLimit));
    headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)));
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Standard API response helpers
 */
export const ApiResponse = {
  success: (data: unknown, status: number = 200) => {
    return NextResponse.json({ success: true, data }, { status });
  },
  
  created: (data: unknown) => {
    return NextResponse.json({ success: true, data }, { status: 201 });
  },
  
  noContent: () => {
    return new NextResponse(null, { status: 204 });
  },
  
  error: (message: string, status: number = 400, details?: unknown) => {
    return NextResponse.json(
      { success: false, error: { message, details } },
      { status }
    );
  },
  
  notFound: (resource: string = 'Resource') => {
    return NextResponse.json(
      { success: false, error: { message: `${resource} not found` } },
      { status: 404 }
    );
  },
  
  badRequest: (message: string, details?: unknown) => {
    return NextResponse.json(
      { success: false, error: { message, details } },
      { status: 400 }
    );
  },
  
  unauthorized: (message: string = 'Unauthorized') => {
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 401 }
    );
  },
  
  forbidden: (message: string = 'Forbidden') => {
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 403 }
    );
  },
  
  serverError: (message: string = 'Internal server error') => {
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  },
};
