import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { TeamLiveStatus } from '@/components/admin/TeamLiveStatus';
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
  id: string; entity_type: string; action: string; created_at: string;
  details: Record<string, unknown>; actor_id: string | null; actor_name?: string;
}

interface UpcomingDeadline {
  id: string; title: string; type: 'design' | 'writing'; due_date: string; client_name: string; status: string;
}

interface ClientSnapshot {
  id: string; name: string; industry: string | null; videoCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);
  const [clients, setClients] = useState<ClientSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const channel = supabase
      .channel('admin-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => fetchActivity())
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
    const weekFromNow = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [
      { count: activeClients }, { count: videosInProduction }, { count: pendingReviews },
      { count: videosLiveThisMonth }, { count: designDue }, { count: writingDue },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('videos').select('*', { count: 'exact', head: true }).not('status', 'in', '("idea","live")'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'client_review'),
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'live').gte('date_delivered', startOfMonth),
      supabase.from('design_tasks').select('*', { count: 'exact', head: true }).lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered'),
      supabase.from('writing_tasks').select('*', { count: 'exact', head: true }).lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered'),
    ]);

    setStats({
      activeClients: activeClients || 0, videosInProduction: videosInProduction || 0,
      pendingReviews: pendingReviews || 0, tasksDueThisWeek: (designDue || 0) + (writingDue || 0),
      videosLiveThisMonth: videosLiveThisMonth || 0,
    });
  };

  const fetchActivity = async () => {
    const { data } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(6);
    if (data) {
      const actorIds = [...new Set(data.map(a => a.actor_id).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds as string[]);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
      }
      setActivity(data.map(a => ({ ...a, details: (a.details as Record<string, unknown>) || {}, actor_name: a.actor_id ? (profileMap[a.actor_id] || 'Unknown') : 'System' })));
    }
  };

  const fetchDeadlines = async () => {
    const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const [{ data: dt }, { data: wt }] = await Promise.all([
      supabase.from('design_tasks').select('id, title, due_date, status, clients(name)').lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered').limit(5),
      supabase.from('writing_tasks').select('id, title, due_date, status, clients(name)').lte('due_date', weekFromNow).gte('due_date', today).not('status', 'eq', 'delivered').limit(5),
    ]);
    const combined: UpcomingDeadline[] = [
      ...(dt || []).map(t => ({ id: t.id, title: t.title, type: 'design' as const, due_date: t.due_date!, status: t.status, client_name: (t.clients as { name: string } | null)?.name || '' })),
      ...(wt || []).map(t => ({ id: t.id, title: t.title, type: 'writing' as const, due_date: t.due_date!, status: t.status, client_name: (t.clients as { name: string } | null)?.name || '' })),
    ].sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 6);
    setDeadlines(combined);
  };

  const fetchClients = async () => {
    const { data: cl } = await supabase.from('clients').select('id, name, industry').eq('is_active', true).limit(6);
    if (cl) {
      const withCounts = await Promise.all(cl.map(async c => {
        const { count } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('client_id', c.id);
        return { ...c, videoCount: count || 0 };
      }));
      setClients(withCounts);
    }
  };

  const statCards = [
    { label: 'Clients', value: stats?.activeClients, icon: Users, accent: 'text-primary' },
    { label: 'In Production', value: stats?.videosInProduction, icon: Video, accent: 'text-blue-400' },
    { label: 'Pending Review', value: stats?.pendingReviews, icon: Clock, accent: 'text-warning' },
    { label: 'Due This Week', value: stats?.tasksDueThisWeek, icon: AlertTriangle, accent: 'text-orange-400' },
    { label: 'Live This Month', value: stats?.videosLiveThisMonth, icon: TrendingUp, accent: 'text-success' },
  ];

  const getActivityDesc = (item: ActivityItem) => {
    const d = item.details;
    const verb = item.action === 'created' ? 'Created' : 'Updated';
    return `${verb} ${item.entity_type.replace('_', ' ')} "${d.title || d.name || ''}"`;
  };

  const getDaysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().setHours(0,0,0,0)) / 86400000);
    if (diff === 0) return { label: 'Today', color: 'text-destructive' };
    if (diff === 1) return { label: 'Tomorrow', color: 'text-warning' };
    return { label: `${diff}d`, color: diff <= 3 ? 'text-warning' : 'text-muted-foreground' };
  };

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchDashboardData}>
        <div className="space-y-5 max-w-6xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Overview</h1>
            <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening.</p>
          </div>

          <TeamLiveStatus />

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {statCards.map(card => (
              <div key={card.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
                  <card.icon size={14} className={card.accent} />
                </div>
                {loading ? (
                  <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{card.value ?? 0}</p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ContentPlanStatusWidget />

            {/* Clients */}
            <div className="lg:col-span-2 glass-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Active Clients</h2>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-11 bg-muted/30 rounded-lg animate-pulse" />)}</div>
              ) : clients.length === 0 ? (
                <div className="text-center py-6">
                  <Users size={24} className="mx-auto text-muted-foreground/40 mb-1" />
                  <p className="text-xs text-muted-foreground">No clients yet</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {clients.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary">{c.name.charAt(0)}</div>
                        <div>
                          <p className="text-xs font-medium text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.industry || '—'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-foreground">{c.videoCount}</p>
                        <p className="text-[10px] text-muted-foreground">videos</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deadlines */}
            <div className="glass-card p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Due This Week</h2>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-lg animate-pulse" />)}</div>
              ) : deadlines.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle size={24} className="mx-auto text-success/40 mb-1" />
                  <p className="text-xs text-muted-foreground">Nothing due 🎉</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {deadlines.map(d => {
                    const { label, color } = getDaysUntil(d.due_date);
                    return (
                      <div key={d.id} className="flex items-start justify-between gap-2 p-2.5 bg-muted/20 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{d.title}</p>
                          <p className="text-[10px] text-muted-foreground">{d.client_name}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${color} whitespace-nowrap`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activity */}
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            {loading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-9 bg-muted/30 rounded-lg animate-pulse" />)}</div>
            ) : activity.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Activity will appear here.</p>
            ) : (
              <div className="space-y-0.5">
                {activity.map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 p-2.5 hover:bg-muted/20 rounded-lg transition-colors">
                    <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                      {item.actor_name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{item.actor_name}</span>{' '}
                        <span className="text-muted-foreground">{getActivityDesc(item)}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
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