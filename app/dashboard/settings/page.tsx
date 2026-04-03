"use client";

import { useTheme } from "next-themes";
import { useUser } from "@/components/user-provider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslation } from "@/lib/i18n/context";
import { Building2, Shield, Globe } from "lucide-react";

// Extended user type with auth provider info
interface ExtendedProfile {
  auth_provider?: string;
  locale?: string;
  timezone?: string;
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, loading } = useUser();
  const { t, locale, setLocale } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [localName, setLocalName] = useState(user?.full_name || "");
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile>({});

  const form = useForm({
    defaultValues: {
      full_name: localName,
    },
    values: {
      full_name: localName,
    },
  });

  // Fetch profile info including auth provider and locale settings
  useEffect(() => {
    async function fetchProfile() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, auth_provider, locale, timezone")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        if (data.full_name) {
          setLocalName(data.full_name);
          form.setValue("full_name", data.full_name);
        }
        setExtendedProfile({
          auth_provider: data.auth_provider,
          locale: data.locale,
          timezone: data.timezone,
        });
      }
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function onSubmit(values: { full_name: string }) {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: values.full_name })
      .eq("id", user?.id);
    setSaving(false);
    if (error) {
      toast.error(t('settings.nameUpdateFailed') + ": " + error.message);
    } else {
      setLocalName(values.full_name);
      toast.success(t('settings.nameUpdateSuccess'));
    }
  }

  // Get auth provider display info
  const getAuthProviderInfo = (provider?: string) => {
    switch (provider) {
      case 'ldap':
        return { label: 'LDAP', icon: Building2, variant: 'secondary' as const };
      case 'lldap':
        return { label: 'LLDAP', icon: Building2, variant: 'secondary' as const };
      case 'local':
        return { label: t('settings.localAuth'), icon: Shield, variant: 'outline' as const };
      case 'supabase':
      default:
        return { label: 'Supabase', icon: Shield, variant: 'default' as const };
    }
  };

  const authInfo = getAuthProviderInfo(extendedProfile.auth_provider);

  return (
    <div className="max-w-lg mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-bold mb-6">{t('settings.title')}</h1>

      {/* Theme Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <span className="font-medium">{t('settings.theme')}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">{t('settings.light')}</span>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")}
            id="theme-toggle"
          />
          <span className="text-sm">{t('settings.dark')}</span>
        </div>
      </div>

      {/* Language Switcher */}
      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{t('settings.language')}</span>
        </div>
        <LanguageSwitcher />
      </div>

      {/* User Info with Auth Provider */}
      <div className="p-4 border rounded-xl bg-muted/30 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            {user?.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={localName || user.email || "User"} />
            ) : (
              <AvatarFallback>{localName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="font-semibold text-lg">{localName || t('settings.anonymousUser')}</div>
            <div className="text-sm text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        
        {/* Auth Provider Badge */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">{t('settings.authProvider')}</span>
          <Badge variant={authInfo.variant} className="flex items-center gap-1">
            <authInfo.icon className="h-3 w-3" />
            {authInfo.label}
          </Badge>
        </div>
      </div>

      {/* Name Change Form */}
      <div className="p-4 border rounded-xl bg-muted/30">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormItem>
              <FormLabel>{t('settings.name')}</FormLabel>
              <FormControl>
                <Input
                  {...form.register("full_name", { required: t('settings.nameRequired') })}
                  placeholder={t('settings.enterNewName')}
                  disabled={loading || saving}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
            <Button type="submit" disabled={loading || saving}>
              {saving ? t('common.saving') : t('settings.updateName')}
            </Button>
          </form>
        </Form>
      </div>

      {/* LDAP Info (if applicable) */}
      {(extendedProfile.auth_provider === 'ldap' || extendedProfile.auth_provider === 'lldap') && (
        <div className="p-4 border rounded-xl bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t('settings.enterpriseAuth')}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.ldapDescription')}
          </p>
        </div>
      )}
    </div>
  );
}
