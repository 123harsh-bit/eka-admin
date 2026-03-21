import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { TeamLiveStatus } from '@/components/admin/TeamLiveStatus';
import { ClientSatisfactionWidget } from '@/components/admin/ClientSatisfactionWidget';
import { ContentPlanStatusWidget } from '@/components/admin/ContentPlanStatusWidget';
import { formatDistanceToNow } from 'date-fns';
import { Users, Video, Clock, CheckCircle, TrendingUp, AlertTriangle } from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface DashboardStats {
  activeClients: number;
  videosInProduction: number;
  pendingReviews: number;
  tasksDueThisWeek: number;
  videosLiveThisMonth: number;
}

interface ActivityItem {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  actor_id: string | null;
  actor_name?: string;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  type: 'video' | 'design' | 'writing';
  due_date: string;
  client_name: string;
  status: string;
}

interface ClientSnapshot {
  id: string;
  name: string;
  industry: string | null;
  is_active: boolean;
  videoCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [clients, setClients] = useState<ClientSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Realtime activity subscription
    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        fetchActivity();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchActivity(), fetchDeadlines(), fetchClients()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [
      { count: activeClients },
      { count: videosInProduction },
      { count: pendingReviews },
      { count: videosLiveThisMonth },
      { count: designDue },
      { count: writingDue },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('videos').select('*', { count: 'exact', head: true }).not('status', 'in', '("idea","live")'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'client_review'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'live').gte('date_delivered', startOfMonth),
      supabase.from('design_tasks').select('*', { count: 'exact', head: true }).lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered'),
      supabase.from('writing_tasks').select('*', { count: 'exact', head: true }).lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered'),
    ]);

    setStats({
      activeClients: activeClients || 0,
      videosInProduction: videosInProduction || 0,
      pendingReviews: pendingReviews || 0,
      tasksDueThisWeek: (designDue || 0) + (writingDue || 0),
      videosLiveThisMonth: videosLiveThisMonth || 0,
    });
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) {
      // Fetch actor names
      const actorIds = [...new Set(data.map(a => a.actor_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', actorIds as string[]);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
      }

      setActivity(data.map(a => ({
        ...a,
        details: (a.details as Record<string, unknown>) || {},
        actor_name: a.actor_id ? (profileMap[a.actor_id] || 'Unknown') : 'System',
      })));
    }
  };

  const fetchDeadlines = async () => {
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [{ data: designTasks }, { data: writingTasks }] = await Promise.all([
      supabase.from('design_tasks').select('id, title, due_date, status, clients(name)').lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered').limit(5),
      supabase.from('writing_tasks').select('id, title, due_date, status, clients(name)').lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered').limit(5),
    ]);

    const combined: UpcomingDeadline[] = [
      ...(designTasks || []).map(t => ({
        id: t.id, title: t.title, type: 'design' as const,
        due_date: t.due_date!, status: t.status,
        client_name: (t.clients as { name: string } | null)?.name || 'Unknown',
      })),
      ...(writingTasks || []).map(t => ({
        id: t.id, title: t.title, type: 'writing' as const,
        due_date: t.due_date!, status: t.status,
        client_name: (t.clients as { name: string } | null)?.name || 'Unknown',
      })),
    ].sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 8);

    setDeadlines(combined);
  };

  const fetchClients = async () => {
    const { data: clientList } = await supabase
      .from('clients')
      .select('id, name, industry, is_active')
      .eq('is_active', true)
      .limit(6);

    if (clientList) {
      const clientsWithCounts = await Promise.all(
        clientList.map(async c => {
          const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('client_id', c.id);
          return { ...c, videoCount: count || 0 };
        })
      );
      setClients(clientsWithCounts);
    }
  };

  const statCards = [
    { label: 'Active Clients', value: stats?.activeClients, icon: Users, color: 'text-primary' },
    { label: 'Videos in Production', value: stats?.videosInProduction, icon: Video, color: 'text-blue-400' },
    { label: 'Pending Reviews', value: stats?.pendingReviews, icon: Clock, color: 'text-warning' },
    { label: 'Tasks Due This Week', value: stats?.tasksDueThisWeek, icon: AlertTriangle, color: 'text-orange-400' },
    { label: 'Videos Live This Month', value: stats?.videosLiveThisMonth, icon: TrendingUp, color: 'text-success' },
  ];

  const getActivityDescription = (item: ActivityItem) => {
    const d = item.details;
    switch (item.entity_type) {
      case 'video': return `${item.action === 'created' ? 'Created' : 'Updated'} video "${d.title || ''}"`;
      case 'client': return `${item.action === 'created' ? 'Added' : 'Updated'} client "${d.name || ''}"`;
      case 'design_task': return `${item.action === 'created' ? 'Created' : 'Updated'} design task "${d.title || ''}"`;
      case 'writing_task': return `${item.action === 'created' ? 'Created' : 'Updated'} writing task "${d.title || ''}"`;
      default: return `${item.action} ${item.entity_type}`;
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return { label: 'Today', color: 'text-destructive' };
    if (diff === 1) return { label: 'Tomorrow', color: 'text-warning' };
    return { label: `${diff}d`, color: diff <= 3 ? 'text-warning' : 'text-muted-foreground' };
  };

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchDashboardData}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Agency Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening at Eka.</p>
        </div>

        {/* Team Live Status */}
        <TeamLiveStatus />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {statCards.map(card => (
            <div key={card.label} className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
                <card.icon size={16} className={card.color} />
              </div>
              {loading ? (
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
              ) : (
                <p className="text-3xl font-display font-bold text-foreground">{card.value ?? 0}</p>
              )}
            </div>
          ))}
          <ClientSatisfactionWidget />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content Plan Status */}
          <ContentPlanStatusWidget />
          {/* Client Snapshots */}
          <div className="lg:col-span-2 glass-card p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Active Clients</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8">
                <Users size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.industry || 'No industry'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{client.videoCount}</p>
                      <p className="text-xs text-muted-foreground">videos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines */}
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">Due This Week</h2>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : deadlines.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle size={32} className="mx-auto text-success/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nothing due this week 🎉</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deadlines.map(d => {
                  const { label, color } = getDaysUntil(d.due_date);
                  return (
                    <div key={d.id} className="flex items-start justify-between gap-2 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                        <p className="text-xs text-muted-foreground">{d.client_name}</p>
                      </div>
                      <span className={`text-xs font-bold ${color} whitespace-nowrap`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Team Activity */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-foreground">Team Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Activity will appear here once your team starts working.</p>
          ) : (
            <div className="space-y-1">
              {activity.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 rounded-lg transition-colors">
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {item.actor_name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{item.actor_name}</span>{' '}
                      <span className="text-muted-foreground">{getActivityDescription(item)}</span>
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </PullToRefresh>
    </AdminLayout>
  );
}
