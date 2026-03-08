import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Video, Palette, PenTool, Star, TrendingUp, Users } from 'lucide-react';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface WeeklyStats {
  videosCompleted: number;
  videosCreated: number;
  designTasksCompleted: number;
  writingTasksCompleted: number;
  avgClientRating: number;
  totalRatings: number;
  teamMembersActive: number;
  topPerformers: { name: string; completed: number; role: string }[];
}

export default function AdminWeeklyReport() {
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);

    const [
      { count: videosCompleted },
      { count: videosCreated },
      { count: designDone },
      { count: writingDone },
      { data: ratings },
      { count: activeMembers },
    ] = await Promise.all([
      supabase.from('videos').select('*', { count: 'exact', head: true }).in('status', ['live', 'approved']).gte('updated_at', weekAgo),
      supabase.from('videos').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('design_tasks').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('updated_at', weekAgo),
      supabase.from('writing_tasks').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('updated_at', weekAgo),
      supabase.from('client_ratings').select('rating').gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ]);

    const avgRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Fetch top performers from activity log
    const { data: activityData } = await supabase
      .from('activity_log')
      .select('actor_id, action')
      .gte('created_at', weekAgo)
      .in('action', ['status_changed', 'created', 'completed']);

    const performerMap: Record<string, number> = {};
    activityData?.forEach(a => {
      if (a.actor_id) performerMap[a.actor_id] = (performerMap[a.actor_id] || 0) + 1;
    });

    const topIds = Object.entries(performerMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([id]) => id);
    let topPerformers: { name: string; completed: number; role: string }[] = [];

    if (topIds.length > 0) {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').in('id', topIds),
        supabase.from('user_roles').select('user_id, role').in('user_id', topIds),
      ]);

      const nameMap: Record<string, string> = {};
      const roleMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.id] = p.full_name; });
      roles?.forEach(r => { roleMap[r.user_id] = r.role; });

      topPerformers = topIds.map(id => ({
        name: nameMap[id] || 'Unknown',
        completed: performerMap[id],
        role: roleMap[id] || 'team',
      }));
    }

    setStats({
      videosCompleted: videosCompleted || 0,
      videosCreated: videosCreated || 0,
      designTasksCompleted: designDone || 0,
      writingTasksCompleted: writingDone || 0,
      avgClientRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings?.length || 0,
      teamMembersActive: activeMembers || 0,
      topPerformers,
    });
    setLoading(false);
  };

  const roleColors: Record<string, string> = {
    admin: 'text-primary', editor: 'text-blue-400', designer: 'text-pink-400',
    writer: 'text-green-400', camera_operator: 'text-orange-400',
  };

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchStats}>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Weekly Performance Report</h1>
            <p className="text-muted-foreground mt-1">Last 7 days summary across the agency.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Videos Completed', value: stats.videosCompleted, icon: Video, color: 'text-primary' },
                  { label: 'Design Tasks Done', value: stats.designTasksCompleted, icon: Palette, color: 'text-pink-400' },
                  { label: 'Writing Tasks Done', value: stats.writingTasksCompleted, icon: PenTool, color: 'text-green-400' },
                  { label: 'New Videos Created', value: stats.videosCreated, icon: TrendingUp, color: 'text-blue-400' },
                ].map(card => (
                  <div key={card.label} className="glass-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{card.label}</p>
                      <card.icon size={16} className={card.color} />
                    </div>
                    <p className="text-3xl font-display font-bold text-foreground">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Client Satisfaction */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Star size={18} className="text-yellow-400" />
                    <h2 className="text-lg font-display font-semibold text-foreground">Client Satisfaction</h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-display font-bold text-foreground">{stats.avgClientRating || '—'}</span>
                    <span className="text-muted-foreground">/5</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''} this week</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={20} className={s <= Math.round(stats.avgClientRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'} />
                    ))}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="glass-card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-primary" />
                    <h2 className="text-lg font-display font-semibold text-foreground">Top Performers</h2>
                  </div>
                  {stats.topPerformers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activity logged this week.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.topPerformers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              <p className={`text-xs capitalize ${roleColors[p.role] || 'text-muted-foreground'}`}>{p.role.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-foreground">{p.completed} actions</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={18} className="text-primary" />
                  <h2 className="text-lg font-display font-semibold text-foreground">Team Overview</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{stats.teamMembersActive}</span> active team members •{' '}
                  <span className="font-semibold text-foreground">{stats.videosCompleted + stats.designTasksCompleted + stats.writingTasksCompleted}</span> total deliverables completed this week
                </p>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
    </AdminLayout>
  );
}
