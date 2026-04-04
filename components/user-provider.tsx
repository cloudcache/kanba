'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthProvider as AuthProviderType, AuthUser } from '@/lib/auth/types';

// User context
interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  auth_provider?: AuthProviderType;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
  authProvider: AuthProviderType | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Get auth provider from environment or localStorage
function getAuthProvider(): AuthProviderType {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('auth_provider');
    if (stored) return stored as AuthProviderType;
  }
  // Default based on environment
  const defaultProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProviderType;
  return defaultProvider || 'supabase';
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [authProvider, setAuthProvider] = useState<AuthProviderType | null>(null);

  // Initialize auth based on provider
  const initializeAuth = useCallback(async () => {
    const provider = getAuthProvider();
    setAuthProvider(provider);

    try {
      switch (provider) {
        case 'supabase': {
          // Dynamic import to avoid errors when Supabase is not configured
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          
          if (!supabase?.auth) {
            console.warn('Supabase auth not initialized');
            break;
          }
          
          const { data: { user: supabaseUser } } = await supabase.auth.getUser();
          if (supabaseUser) {
            setUser({
              id: supabaseUser.id,
              email: supabaseUser.email || '',
              full_name: supabaseUser.user_metadata?.full_name,
              avatar_url: supabaseUser.user_metadata?.avatar_url,
              auth_provider: 'supabase',
            });
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (session?.user) {
                setUser({
                  id: session.user.id,
                  email: session.user.email || '',
                  full_name: session.user.user_metadata?.full_name,
                  avatar_url: session.user.user_metadata?.avatar_url,
                  auth_provider: 'supabase',
                });
              } else {
                setUser(null);
              }
              setLoading(false);
            }
          );

          // Store cleanup function
          (window as any).__supabaseUnsubscribe = () => subscription.unsubscribe();
          break;
        }

        case 'ldap':
        case 'lldap':
        case 'local': {
          // For non-Supabase auth, check session from API
          const response = await fetch('/api/auth/session');
          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              setUser({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.fullName || data.user.full_name,
                avatar_url: data.user.avatarUrl || data.user.avatar_url,
                auth_provider: provider,
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    return () => {
      // Cleanup Supabase subscription if exists
      if ((window as any).__supabaseUnsubscribe) {
        (window as any).__supabaseUnsubscribe();
      }
    };
  }, [initializeAuth]);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    await initializeAuth();
  }, [initializeAuth]);

  const signOut = useCallback(async () => {
    try {
      const provider = authProvider || getAuthProvider();
      
      switch (provider) {
        case 'supabase': {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase.auth.signOut();
          break;
        }
        
        case 'ldap':
        case 'lldap':
        case 'local': {
          // Call logout API
          await fetch('/api/auth/logout', { method: 'POST' });
          break;
        }
      }
      
      // Clear local storage
      localStorage.removeItem('auth_provider');
      localStorage.removeItem('auth_token');
      
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [authProvider]);

  // Only show loading until auth listener is set up, or until we have user data
  const isLoading = (!initialized && !user) || (loading && !user);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading: isLoading, 
      authProvider,
      signOut,
      refreshUser,
    }}>
      {children}
    </UserContext.Provider>
  );
}
