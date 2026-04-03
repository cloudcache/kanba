/**
 * LDAP Authentication API Route
 * Phase 1: LDAP/LLDAP authentication endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, provider = 'ldap' } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (provider !== 'ldap' && provider !== 'lldap') {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Authenticate with LDAP/LLDAP
    const result = await authService.authenticate(provider, {
      username,
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Authentication failed',
          errorCode: result.errorCode,
        },
        { status: 401 }
      );
    }

    // Sync user to local database
    const syncedUser = await authService.syncUserToDatabase(result.user!);

    // In a real implementation, you would create a session here
    // For now, we return the user data
    // The frontend will use this to set up the session

    return NextResponse.json({
      success: true,
      user: {
        id: syncedUser.id,
        email: syncedUser.email,
        fullName: syncedUser.fullName,
        avatarUrl: syncedUser.avatarUrl,
        authProvider: syncedUser.authProvider,
      },
    });
  } catch (error: any) {
    console.error('LDAP authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET: Check LDAP configuration status
 */
export async function GET() {
  try {
    const methods = authService.getAvailableMethods();
    const ldapEnabled = methods.some(m => m.provider === 'ldap');
    const lldapEnabled = methods.some(m => m.provider === 'lldap');

    return NextResponse.json({
      ldapEnabled,
      lldapEnabled,
      providers: methods.map(m => ({
        provider: m.provider,
        name: m.name,
        enabled: true,
      })),
    });
  } catch (error: any) {
    console.error('Error getting auth providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
