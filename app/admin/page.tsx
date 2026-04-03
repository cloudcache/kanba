'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  FolderKanban, 
  CheckSquare, 
  Settings, 
  Shield,
  Activity,
  Globe,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalTasks: number;
  activeUsers: number;
  proUsers: number;
  adminUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProjects: 0,
    totalTasks: 0,
    activeUsers: 0,
    proUsers: 0,
    adminUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: proUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'pro');

        const { count: adminUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_admin', true);

        const { count: totalProjects } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });

        const { count: totalTasks } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true });

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: activeUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', thirtyDaysAgo.toISOString());

        setStats({
          totalUsers: totalUsers || 0,
          totalProjects: totalProjects || 0,
          totalTasks: totalTasks || 0,
          activeUsers: activeUsers || 0,
          proUsers: proUsers || 0,
          adminUsers: adminUsers || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },
    { title: 'Pro Users', value: stats.proUsers, icon: Shield, color: 'text-purple-500' },
    { title: 'Admin Users', value: stats.adminUsers, icon: Shield, color: 'text-red-500' },
    { title: 'Active Users (30d)', value: stats.activeUsers, icon: Activity, color: 'text-green-500' },
    { title: 'Total Projects', value: stats.totalProjects, icon: FolderKanban, color: 'text-orange-500' },
    { title: 'Total Tasks', value: stats.totalTasks, icon: CheckSquare, color: 'text-cyan-500' },
  ];

  const menuItems = [
    { title: 'Users Management', description: 'Manage users, roles, and permissions', href: '/admin/users', icon: Users },
    { title: 'Projects Management', description: 'View and manage all projects', href: '/admin/projects', icon: FolderKanban },
    { title: 'System Settings', description: 'Configure system-wide settings', href: '/admin/settings', icon: Settings },
    { title: 'Localization', description: 'Manage languages and translations', href: '/admin/localization', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Kanba System Administration</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '-' : stat.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-4">Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <Card key={item.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href={item.href}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="text-sm">{item.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
