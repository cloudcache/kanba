'use client';

/**
 * Authentication Method Selector Component
 * Phase 1: Select between different authentication methods
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Mail } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface AuthProvider {
  provider: string;
  name: string;
  icon: string;
  type: string;
}

interface AuthMethodSelectorProps {
  children: (selectedMethod: string) => React.ReactNode;
}

export function AuthMethodSelector({ children }: AuthMethodSelectorProps) {
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('supabase');
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    async function fetchProviders() {
      try {
        const response = await fetch('/api/auth/providers');
        if (response.ok) {
          const data = await response.json();
          setProviders(data.providers || []);
          
          // Set default method if available
          if (data.providers?.length > 0) {
            setSelectedMethod(data.providers[0].provider);
          }
        }
      } catch (error) {
        console.error('Failed to fetch auth providers:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProviders();
  }, []);

  // If only one provider or loading, don't show tabs
  if (loading || providers.length <= 1) {
    return <>{children(selectedMethod)}</>;
  }

  const getIcon = (provider: string) => {
    switch (provider) {
      case 'ldap':
      case 'lldap':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  return (
    <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        {providers.map((provider) => (
          <TabsTrigger
            key={provider.provider}
            value={provider.provider}
            className="flex items-center gap-2"
          >
            {getIcon(provider.provider)}
            <span className="hidden sm:inline">
              {provider.provider === 'supabase'
                ? t('auth.accountLogin')
                : t('auth.enterpriseLogin')}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      {providers.map((provider) => (
        <TabsContent key={provider.provider} value={provider.provider}>
          {children(provider.provider)}
        </TabsContent>
      ))}
    </Tabs>
  );
}
