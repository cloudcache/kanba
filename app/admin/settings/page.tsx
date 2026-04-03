'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Shield,
  Globe,
  Mail,
  Database,
  Bell,
} from 'lucide-react';

interface SystemSettings {
  // General
  site_name: string;
  site_description: string;
  
  // Auth
  ldap_enabled: boolean;
  allow_registration: boolean;
  require_email_verification: boolean;
  
  // Limits
  free_project_limit: number;
  free_task_limit: number;
  
  // Email
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  
  // Features
  enable_ai_features: boolean;
  enable_api_access: boolean;
  enable_webhooks: boolean;
}

const defaultSettings: SystemSettings = {
  site_name: 'Kanba',
  site_description: 'Project Management Made Simple',
  ldap_enabled: false,
  allow_registration: true,
  require_email_verification: false,
  free_project_limit: 1,
  free_task_limit: 100,
  smtp_enabled: false,
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  enable_ai_features: false,
  enable_api_access: false,
  enable_webhooks: false,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0) {
        const loadedSettings: Partial<SystemSettings> = {};
        data.forEach((item: { key: string; value: string }) => {
          try {
            loadedSettings[item.key as keyof SystemSettings] = JSON.parse(item.value);
          } catch {
            loadedSettings[item.key as keyof SystemSettings] = item.value as any;
          }
        });
        setSettings({ ...defaultSettings, ...loadedSettings });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Use defaults if table doesn't exist
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      // Save each setting individually
      for (const [key, value] of Object.entries(settings)) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key,
            value: JSON.stringify(value),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });

        if (error) throw error;
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function updateSetting<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">System Settings</h1>
              <p className="text-sm text-muted-foreground">Configure system-wide settings</p>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  General Settings
                </CardTitle>
                <CardDescription>Basic site configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="site_name">Site Name</Label>
                  <Input
                    id="site_name"
                    value={settings.site_name}
                    onChange={(e) => updateSetting('site_name', e.target.value)}
                    placeholder="Kanba"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site_description">Site Description</Label>
                  <Textarea
                    id="site_description"
                    value={settings.site_description}
                    onChange={(e) => updateSetting('site_description', e.target.value)}
                    placeholder="Project Management Made Simple"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Authentication Settings
                </CardTitle>
                <CardDescription>Configure authentication options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Registration</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to register</p>
                  </div>
                  <Switch
                    checked={settings.allow_registration}
                    onCheckedChange={(checked) => updateSetting('allow_registration', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Email Verification</Label>
                    <p className="text-sm text-muted-foreground">Users must verify email before logging in</p>
                  </div>
                  <Switch
                    checked={settings.require_email_verification}
                    onCheckedChange={(checked) => updateSetting('require_email_verification', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable LDAP Authentication</Label>
                    <p className="text-sm text-muted-foreground">Allow enterprise LDAP/Active Directory login</p>
                  </div>
                  <Switch
                    checked={settings.ldap_enabled}
                    onCheckedChange={(checked) => updateSetting('ldap_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Plan Limits
                </CardTitle>
                <CardDescription>Configure limits for free plan users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="free_project_limit">Free Plan Project Limit</Label>
                  <Input
                    id="free_project_limit"
                    type="number"
                    min="1"
                    value={settings.free_project_limit}
                    onChange={(e) => updateSetting('free_project_limit', parseInt(e.target.value) || 1)}
                  />
                  <p className="text-sm text-muted-foreground">Maximum number of projects for free users</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="free_task_limit">Free Plan Task Limit (per project)</Label>
                  <Input
                    id="free_task_limit"
                    type="number"
                    min="1"
                    value={settings.free_task_limit}
                    onChange={(e) => updateSetting('free_task_limit', parseInt(e.target.value) || 100)}
                  />
                  <p className="text-sm text-muted-foreground">Maximum tasks per project for free users</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Feature Toggles
                </CardTitle>
                <CardDescription>Enable or disable platform features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>AI Features</Label>
                    <p className="text-sm text-muted-foreground">Enable AI-powered features like task suggestions</p>
                  </div>
                  <Switch
                    checked={settings.enable_ai_features}
                    onCheckedChange={(checked) => updateSetting('enable_ai_features', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Access</Label>
                    <p className="text-sm text-muted-foreground">Allow users to generate API keys</p>
                  </div>
                  <Switch
                    checked={settings.enable_api_access}
                    onCheckedChange={(checked) => updateSetting('enable_api_access', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Webhooks</Label>
                    <p className="text-sm text-muted-foreground">Allow users to configure webhooks</p>
                  </div>
                  <Switch
                    checked={settings.enable_webhooks}
                    onCheckedChange={(checked) => updateSetting('enable_webhooks', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
