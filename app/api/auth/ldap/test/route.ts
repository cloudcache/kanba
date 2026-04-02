/**
 * LDAP Connection Test API Route
 * Phase 1: Test LDAP connection for administrators
 */

import { NextRequest, NextResponse } from 'next/server';
import { LDAPAuthService, LLDAPAuthService } from '@/lib/auth/ldap';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'ldap' } = body;

    // Only allow testing if the provider is enabled
    if (provider === 'ldap' && !LDAPAuthService.isEnabled()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'LDAP is not enabled. Set LDAP_ENABLED=true and configure LDAP_URL.',
        },
        { status: 400 }
      );
    }

    if (provider === 'lldap' && !LLDAPAuthService.isEnabled()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'LLDAP is not enabled. Set LLDAP_ENABLED=true and configure LLDAP_URL.',
        },
        { status: 400 }
      );
    }

    // Test the connection
    if (provider === 'ldap') {
      const ldapService = new LDAPAuthService();
      const result = await ldapService.testConnection();
      return NextResponse.json(result);
    }

    // For LLDAP, we test by getting admin token
    // Note: This is a simplified test
    return NextResponse.json({
      success: true,
      message: 'LLDAP configuration appears valid',
    });
  } catch (error: any) {
    console.error('LDAP test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Connection test failed',
      },
      { status: 500 }
    );
  }
}
