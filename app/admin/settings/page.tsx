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
  Database,
  Bell,
  CreditCard,
  Package,
  Plus,
  Trash2,
  DollarSign,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  stripe_price_id: string;
  stripe_product_id: string;
  features: string[];
  project_limit: number;
  task_limit: number;
  is_active: boolean;
}

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

  // Payment
  stripe_enabled: boolean;
  stripe_public_key: string;
  stripe_webhook_secret: string;
  payment_currency: string;
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
  stripe_enabled: true,
  stripe_public_key: '',
  stripe_webhook_secret: '',
  payment_currency: 'usd',
};

const defaultPlan: SubscriptionPlan = {
  id: '',
  name: '',
  description: '',
  price: 0,
  currency: 'usd',
  interval: 'month',
  stripe_price_id: '',
  stripe_product_id: '',
  features: [],
  project_limit: -1,
  task_limit: -1,
  is_active: true,
};

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    fetchSettings();
    fetchPlans();
  }, []);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error && error.code !== 'PGRST116') throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Set default plans if table doesn't exist
      setPlans([
        {
          id: 'free',
          name: 'Free',
          description: 'Basic features for individuals',
          price: 0,
          currency: 'usd',
          interval: 'month',
          stripe_price_id: '',
          stripe_product_id: '',
          features: ['1 Project', '100 Tasks', 'Basic Support'],
          project_limit: 1,
          task_limit: 100,
          is_active: true,
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Unlimited features for professionals',
          price: 4.90,
          currency: 'usd',
          interval: 'month',
          stripe_price_id: 'price_1Rmcm6R1k9dZk2ZUktVYH81E',
          stripe_product_id: 'prod_Si2r3Gt3xtmwER',
          features: ['Unlimited Projects', 'Unlimited Tasks', 'Priority Support', 'Advanced Analytics', 'API Access'],
          project_limit: -1,
          task_limit: -1,
          is_active: true,
        },
      ]);
    }
  }

  async function savePlan(plan: SubscriptionPlan) {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .upsert({
          ...plan,
          id: plan.id || undefined,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success('Plan saved successfully');
      setShowPlanDialog(false);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success('Plan deleted');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  }

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
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
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

          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Settings (Stripe)
                </CardTitle>
                <CardDescription>Configure Stripe payment integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Stripe Payments</Label>
                    <p className="text-sm text-muted-foreground">Accept payments via Stripe</p>
                  </div>
                  <Switch
                    checked={settings.stripe_enabled}
                    onCheckedChange={(checked) => updateSetting('stripe_enabled', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_public_key">Stripe Public Key</Label>
                  <Input
                    id="stripe_public_key"
                    value={settings.stripe_public_key}
                    onChange={(e) => updateSetting('stripe_public_key', e.target.value)}
                    placeholder="pk_live_..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Found in Stripe Dashboard under Developers &gt; API keys
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_webhook_secret">Stripe Webhook Secret</Label>
                  <Input
                    id="stripe_webhook_secret"
                    type="password"
                    value={settings.stripe_webhook_secret}
                    onChange={(e) => updateSetting('stripe_webhook_secret', e.target.value)}
                    placeholder="whsec_..."
                  />
                  <p className="text-sm text-muted-foreground">
                    Webhook endpoint: {typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment_currency">Default Currency</Label>
                  <Select
                    value={settings.payment_currency}
                    onValueChange={(value) => updateSetting('payment_currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="cny">CNY (¥)</SelectItem>
                      <SelectItem value="jpy">JPY (¥)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Environment Variables Required</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Make sure these are set in your deployment environment:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>STRIPE_SECRET_KEY - Your Stripe secret key</li>
                    <li>STRIPE_WEBHOOK_SECRET - Webhook signing secret</li>
                    <li>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY - Public key</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Subscription Plans
                    </CardTitle>
                    <CardDescription>Configure available subscription plans</CardDescription>
                  </div>
                  <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingPlan({ ...defaultPlan, id: crypto.randomUUID() })}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{editingPlan?.name ? 'Edit Plan' : 'New Plan'}</DialogTitle>
                        <DialogDescription>Configure subscription plan details</DialogDescription>
                      </DialogHeader>
                      {editingPlan && (
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Plan Name</Label>
                              <Input
                                value={editingPlan.name}
                                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                                placeholder="Pro"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Price</Label>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={editingPlan.price}
                                  onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                                  placeholder="9.99"
                                />
                                <Select
                                  value={editingPlan.interval}
                                  onValueChange={(value: 'month' | 'year') => setEditingPlan({ ...editingPlan, interval: value })}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="month">/month</SelectItem>
                                    <SelectItem value="year">/year</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={editingPlan.description}
                              onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                              placeholder="Unlimited features for professionals"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Stripe Product ID</Label>
                              <Input
                                value={editingPlan.stripe_product_id}
                                onChange={(e) => setEditingPlan({ ...editingPlan, stripe_product_id: e.target.value })}
                                placeholder="prod_xxx"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Stripe Price ID</Label>
                              <Input
                                value={editingPlan.stripe_price_id}
                                onChange={(e) => setEditingPlan({ ...editingPlan, stripe_price_id: e.target.value })}
                                placeholder="price_xxx"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Project Limit (-1 for unlimited)</Label>
                              <Input
                                type="number"
                                value={editingPlan.project_limit}
                                onChange={(e) => setEditingPlan({ ...editingPlan, project_limit: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Task Limit (-1 for unlimited)</Label>
                              <Input
                                type="number"
                                value={editingPlan.task_limit}
                                onChange={(e) => setEditingPlan({ ...editingPlan, task_limit: parseInt(e.target.value) })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Features</Label>
                            <div className="flex gap-2">
                              <Input
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                placeholder="Add a feature..."
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && newFeature.trim()) {
                                    e.preventDefault();
                                    setEditingPlan({
                                      ...editingPlan,
                                      features: [...editingPlan.features, newFeature.trim()]
                                    });
                                    setNewFeature('');
                                  }
                                }}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  if (newFeature.trim()) {
                                    setEditingPlan({
                                      ...editingPlan,
                                      features: [...editingPlan.features, newFeature.trim()]
                                    });
                                    setNewFeature('');
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {editingPlan.features.map((feature, index) => (
                                <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                                  <span className="text-sm">{feature}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPlan({
                                      ...editingPlan,
                                      features: editingPlan.features.filter((_, i) => i !== index)
                                    })}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    &times;
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Active</Label>
                              <p className="text-sm text-muted-foreground">Show this plan to users</p>
                            </div>
                            <Switch
                              checked={editingPlan.is_active}
                              onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_active: checked })}
                            />
                          </div>
                        </div>
                      )}
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
                        <Button onClick={() => editingPlan && savePlan(editingPlan)}>Save Plan</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Stripe IDs</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{plan.name}</div>
                            <div className="text-sm text-muted-foreground">{plan.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {plan.price}/{plan.interval}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Projects: {plan.project_limit === -1 ? 'Unlimited' : plan.project_limit}</div>
                            <div>Tasks: {plan.task_limit === -1 ? 'Unlimited' : plan.task_limit}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground font-mono">
                            {plan.stripe_product_id ? (
                              <>
                                <div>{plan.stripe_product_id}</div>
                                <div>{plan.stripe_price_id}</div>
                              </>
                            ) : (
                              <span>Not configured</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${plan.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'}`}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPlan(plan);
                                setShowPlanDialog(true);
                              }}
                            >
                              Edit
                            </Button>
                            {plan.price > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => deletePlan(plan.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
