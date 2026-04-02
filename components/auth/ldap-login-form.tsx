'use client';

/**
 * LDAP Login Form Component
 * Phase 1: Enterprise LDAP/LLDAP authentication form
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface LDAPLoginFormProps {
  provider?: 'ldap' | 'lldap';
  onSuccess?: () => void;
}

export function LDAPLoginForm({ provider = 'ldap', onSuccess }: LDAPLoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/ldap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          provider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('auth.invalidCredentials'));
      }

      toast.success(t('auth.welcomeBack'));
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium">{t('auth.enterpriseLogin')}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ldap-username">{t('auth.ldapUsername')}</Label>
        <Input
          id="ldap-username"
          type="text"
          placeholder={t('auth.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ldap-password">{t('auth.ldapPassword')}</Label>
        <Input
          id="ldap-password"
          type="password"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t('auth.signInWithLdap')}
      </Button>
    </form>
  );
}
