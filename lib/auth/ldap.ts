/**
 * LDAP Authentication Service
 * Phase 1: LDAP/LLDAP authentication support
 */

import type {
  LDAPConfig,
  LDAPCredentials,
  AuthResult,
  AuthUser,
  LDAPUserEntry,
} from './types';

// Default LDAP configuration from environment variables
export function getLDAPConfig(): LDAPConfig | null {
  const url = process.env.LDAP_URL;
  if (!url) {
    return null;
  }

  return {
    url,
    bindDN: process.env.LDAP_BIND_DN || '',
    bindPassword: process.env.LDAP_BIND_PASSWORD || '',
    searchBase: process.env.LDAP_SEARCH_BASE || '',
    searchFilter: process.env.LDAP_SEARCH_FILTER || '(uid={{username}})',
    tlsEnabled: process.env.LDAP_TLS_ENABLED === 'true',
    tlsOptions: {
      rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
    userAttributes: {
      uid: process.env.LDAP_ATTR_UID || 'uid',
      email: process.env.LDAP_ATTR_EMAIL || 'mail',
      fullName: process.env.LDAP_ATTR_FULLNAME || 'cn',
      avatarUrl: process.env.LDAP_ATTR_AVATAR,
      memberOf: process.env.LDAP_ATTR_MEMBEROF || 'memberOf',
    },
    connectionTimeout: parseInt(process.env.LDAP_CONNECTION_TIMEOUT || '5000', 10),
    idleTimeout: parseInt(process.env.LDAP_IDLE_TIMEOUT || '60000', 10),
  };
}

/**
 * LDAP Authentication Service
 * Note: This is a server-side only module
 */
export class LDAPAuthService {
  private config: LDAPConfig;
  private ldapClient: any = null;

  constructor(config?: LDAPConfig) {
    const envConfig = getLDAPConfig();
    if (!config && !envConfig) {
      throw new Error('LDAP configuration is required');
    }
    this.config = config || envConfig!;
  }

  /**
   * Check if LDAP is enabled
   */
  static isEnabled(): boolean {
    return process.env.LDAP_ENABLED === 'true' && !!process.env.LDAP_URL;
  }

  /**
   * Authenticate user with LDAP credentials
   */
  async authenticate(credentials: LDAPCredentials): Promise<AuthResult> {
    // Dynamically import ldapjs only on server side
    let ldap: any;
    try {
      ldap = await import('ldapjs');
    } catch (error) {
      console.error('Failed to import ldapjs:', error);
      return {
        success: false,
        error: 'LDAP module not available',
        errorCode: 'LDAP_CONNECTION_ERROR',
      };
    }

    const client = ldap.createClient({
      url: this.config.url,
      timeout: this.config.connectionTimeout,
      connectTimeout: this.config.connectionTimeout,
      tlsOptions: this.config.tlsEnabled ? this.config.tlsOptions : undefined,
    });

    try {
      // Step 1: Bind with admin credentials to search for user
      await this.bind(client, this.config.bindDN, this.config.bindPassword);

      // Step 2: Search for the user
      const userEntry = await this.searchUser(client, credentials.username);
      if (!userEntry) {
        return {
          success: false,
          error: 'User not found',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      // Step 3: Try to bind with user's credentials to verify password
      const userClient = ldap.createClient({
        url: this.config.url,
        timeout: this.config.connectionTimeout,
        connectTimeout: this.config.connectionTimeout,
        tlsOptions: this.config.tlsEnabled ? this.config.tlsOptions : undefined,
      });

      try {
        await this.bind(userClient, userEntry.dn, credentials.password);
        userClient.unbind();
      } catch (bindError) {
        return {
          success: false,
          error: 'Invalid credentials',
          errorCode: 'INVALID_CREDENTIALS',
        };
      }

      // Step 4: Map LDAP user to AuthUser
      const authUser = this.mapLDAPUserToAuthUser(userEntry);

      return {
        success: true,
        user: authUser,
      };
    } catch (error: any) {
      console.error('LDAP authentication error:', error);
      return {
        success: false,
        error: error.message || 'LDAP authentication failed',
        errorCode: 'LDAP_CONNECTION_ERROR',
      };
    } finally {
      client.unbind();
    }
  }

  /**
   * Bind to LDAP server
   */
  private bind(client: any, dn: string, password: string): Promise<void> {
    return new Promise((resolve, reject) => {
      client.bind(dn, password, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Search for user in LDAP directory
   */
  private searchUser(client: any, username: string): Promise<LDAPUserEntry | null> {
    return new Promise((resolve, reject) => {
      const filter = this.config.searchFilter.replace('{{username}}', username);
      
      const opts = {
        filter,
        scope: 'sub' as const,
        attributes: [
          this.config.userAttributes.uid,
          this.config.userAttributes.email,
          this.config.userAttributes.fullName,
          this.config.userAttributes.memberOf || 'memberOf',
          'dn',
        ],
      };

      client.search(this.config.searchBase, opts, (err: any, res: any) => {
        if (err) {
          reject(err);
          return;
        }

        let user: LDAPUserEntry | null = null;

        res.on('searchEntry', (entry: any) => {
          const attributes = entry.attributes || entry.pojo?.attributes || [];
          const obj: Record<string, any> = { dn: entry.dn || entry.objectName };
          
          for (const attr of attributes) {
            const attrName = attr.type || attr._type;
            const attrValues = attr.values || attr._vals || [];
            obj[attrName] = attrValues.length === 1 ? attrValues[0] : attrValues;
          }
          
          user = obj as LDAPUserEntry;
        });

        res.on('error', (err: any) => {
          reject(err);
        });

        res.on('end', () => {
          resolve(user);
        });
      });
    });
  }

  /**
   * Map LDAP user entry to AuthUser
   */
  private mapLDAPUserToAuthUser(entry: LDAPUserEntry): AuthUser {
    const attrs = this.config.userAttributes;
    
    // Extract email
    const email = this.getAttributeValue(entry, attrs.email) || 
                  `${this.getAttributeValue(entry, attrs.uid)}@ldap.local`;
    
    // Extract full name
    const fullName = this.getAttributeValue(entry, attrs.fullName) ||
                     this.getAttributeValue(entry, attrs.uid);

    // Extract groups
    const groups = this.getAttributeValues(entry, attrs.memberOf || 'memberOf');

    return {
      id: `ldap_${this.getAttributeValue(entry, attrs.uid)}`,
      email,
      fullName,
      authProvider: 'ldap',
      externalId: entry.dn,
      groups,
      metadata: {
        ldapDN: entry.dn,
        ldapUid: this.getAttributeValue(entry, attrs.uid),
      },
    };
  }

  /**
   * Get single attribute value
   */
  private getAttributeValue(entry: LDAPUserEntry, attrName: string): string | undefined {
    const value = entry[attrName];
    if (Array.isArray(value)) {
      return value[0]?.toString();
    }
    return value?.toString();
  }

  /**
   * Get multiple attribute values
   */
  private getAttributeValues(entry: LDAPUserEntry, attrName: string): string[] {
    const value = entry[attrName];
    if (Array.isArray(value)) {
      return value.map(v => v.toString());
    }
    if (value) {
      return [value.toString()];
    }
    return [];
  }

  /**
   * Test LDAP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    let ldap: any;
    try {
      ldap = await import('ldapjs');
    } catch (error) {
      return { success: false, error: 'LDAP module not available' };
    }

    const client = ldap.createClient({
      url: this.config.url,
      timeout: this.config.connectionTimeout,
      connectTimeout: this.config.connectionTimeout,
    });

    try {
      await this.bind(client, this.config.bindDN, this.config.bindPassword);
      client.unbind();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

/**
 * LLDAP (Light LDAP) Authentication Service
 * LLDAP is a lightweight LDAP server with a simpler API
 */
export class LLDAPAuthService {
  private baseUrl: string;
  private adminUsername: string;
  private adminPassword: string;
  private baseDN: string;

  constructor() {
    this.baseUrl = process.env.LLDAP_URL || '';
    this.adminUsername = process.env.LLDAP_ADMIN_USERNAME || '';
    this.adminPassword = process.env.LLDAP_ADMIN_PASSWORD || '';
    this.baseDN = process.env.LLDAP_BASE_DN || '';
  }

  /**
   * Check if LLDAP is enabled
   */
  static isEnabled(): boolean {
    return process.env.LLDAP_ENABLED === 'true' && !!process.env.LLDAP_URL;
  }

  /**
   * Authenticate using LLDAP's HTTP API
   */
  async authenticate(credentials: LDAPCredentials): Promise<AuthResult> {
    try {
      // LLDAP provides both LDAP and GraphQL/REST APIs
      // Here we use the simpler bind approach via LDAP
      const ldapService = new LDAPAuthService({
        url: `${this.baseUrl.replace('http', 'ldap').replace(':17170', ':3890')}`,
        bindDN: `uid=${credentials.username},ou=people,${this.baseDN}`,
        bindPassword: credentials.password,
        searchBase: `ou=people,${this.baseDN}`,
        searchFilter: `(uid=${credentials.username})`,
        tlsEnabled: false,
        userAttributes: {
          uid: 'uid',
          email: 'mail',
          fullName: 'cn',
          memberOf: 'memberOf',
        },
      });

      return await ldapService.authenticate(credentials);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'LLDAP authentication failed',
        errorCode: 'LDAP_CONNECTION_ERROR',
      };
    }
  }

  /**
   * Get admin JWT token from LLDAP
   */
  private async getAdminToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/simple/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: this.adminUsername,
          password: this.adminPassword,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Failed to get LLDAP admin token:', error);
      return null;
    }
  }

  /**
   * Search users via LLDAP GraphQL API
   */
  async searchUsers(query: string): Promise<AuthUser[]> {
    const token = await this.getAdminToken();
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `
            query SearchUsers($query: String!) {
              users(filters: { any: [
                { eq: { field: "uid", value: $query } },
                { eq: { field: "mail", value: $query } },
                { contains: { field: "displayName", value: $query } }
              ]}) {
                id
                email
                displayName
                groups {
                  displayName
                }
              }
            }
          `,
          variables: { query },
        }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.data?.users || []).map((user: any) => ({
        id: `lldap_${user.id}`,
        email: user.email,
        fullName: user.displayName,
        authProvider: 'lldap' as const,
        groups: user.groups?.map((g: any) => g.displayName) || [],
      }));
    } catch (error) {
      console.error('Failed to search LLDAP users:', error);
      return [];
    }
  }
}
