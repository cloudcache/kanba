/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Building2 } from 'lucide-react';
import Image from 'next/image'; 
import { useTheme } from 'next-themes';
import { ShineBorder } from '@/src/components/magicui/shine-border';
import { LDAPLoginForm } from '@/components/auth/ldap-login-form';
import { useTranslation } from '@/lib/i18n/context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authProviders, setAuthProviders] = useState<string[]>(['supabase']);
  const [activeTab, setActiveTab] = useState('supabase');
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if user is already logged in and fetch available auth providers
    const initialize = async () => {
      try {
        // Check auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.push('/dashboard');
          return;
        }

        // Fetch available auth providers
        const response = await fetch('/api/auth/providers');
        if (response.ok) {
          const data = await response.json();
          setAuthProviders(data.providers || ['supabase']);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    initialize();
  }, [router]);

  const ldapEnabled = authProviders.includes('ldap') || authProviders.includes('lldap');
  const ldapProvider = authProviders.includes('lldap') ? 'lldap' : 'ldap';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Welcome back!');
        router.push('/dashboard');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md relative overflow-hidden">
      <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} />

        <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
                <Image 
                  src={theme === 'light' ? '/logo-light.png' : '/logo-dark.png'} 
                  width={50} 
                  height={50} 
                  alt="Kanba Logo" 
                />
              </div>
          <CardTitle className="text-2xl">{t('auth.welcomeBack')}</CardTitle>
          <CardDescription>
            {t('auth.signInDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ldapEnabled ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="supabase">{t('auth.accountLogin')}</TabsTrigger>
                <TabsTrigger value="ldap" className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {t('auth.enterpriseLogin')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="supabase">
                <div className="flex flex-col gap-2 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={loading}
                  >
                    <Image src="/google.svg" alt="Google" width={20} height={20} />
                    {t('auth.signInWithGoogle')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={() => handleOAuthSignIn('github')}
                    disabled={loading}
                  >
                    <Image src="/github.svg" alt="GitHub" width={20} height={20} className="dark:invert"/>
                    {t('auth.signInWithGithub')}
                  </Button>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t('auth.enterEmail')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={t('auth.enterPassword')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('auth.signIn')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="ldap">
                <LDAPLoginForm provider={ldapProvider as 'ldap' | 'lldap'} />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={loading}
                >
                  <Image src="/google.svg" alt="Google" width={20} height={20} />
                  {t('auth.signInWithGoogle')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={loading}
                >
                  <Image src="/github.svg" alt="GitHub" width={20} height={20} className="dark:invert"/>
                  {t('auth.signInWithGithub')}
                </Button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signIn')}
                </Button>
              </form>
            </>
          )}
          
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{t('auth.noAccount')} </span>
            <Link href="/signup" className="text-primary hover:underline">
              {t('auth.signUp')}
            </Link>
          </div>
          
          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
