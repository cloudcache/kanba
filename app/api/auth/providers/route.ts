/**
 * Authentication Providers API Route
 * Phase 1: Get available authentication providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';

export async function GET() {
  try {
    const methods = authService.getAvailableMethods();

    return NextResponse.json({
      providers: methods.map(m => ({
        provider: m.provider,
        name: m.name,
        icon: m.icon,
        type: m.type,
      })),
      // OAuth providers (Google, GitHub) are always available via Supabase
      oauthProviders: [
        { provider: 'google', name: 'Google', icon: 'google' },
        { provider: 'github', name: 'GitHub', icon: 'github' },
      ],
    });
  } catch (error: any) {
    console.error('Error getting auth providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
