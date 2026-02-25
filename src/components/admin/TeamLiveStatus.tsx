import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_LABELS } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

interface TeamMemberStatus {
  id: string; full_name: string; role: string; avatar_url: string | null;
  is_online: boolean; last_seen: string | null;
  login_time: string | null; status: string | null;
}

export function TeamLiveStatus() {
  const [team, setTeam] = useState<TeamMemberStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    fetchTeamStatus();
    
    // Refresh presence every 60 seconds
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    
    // Realtime subscription on profiles for presence changes
    const channel = supabase
      .channel('team-presence')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, fetchTeamStatus)
      .subscribe();
    
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  const fetchTeamStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'in', '("admin","client")');
    if (!roles || roles.length === 0) { setTeam([]); setLoading(false); return; }
    
    const userIds = roles.map(r => r.user_id);
    const roleMap: Record<string, string> = {};
    roles.forEach(r => { roleMap[r.user_id] = r.role; });

    const [{ data: profiles }, { data: attendance }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_url, is_online, last_seen').in('id', userIds),
      supabase.from('attendance_logs').select('user_id, login_time, status').eq('date', today).in('user_id', userIds),
    ]);

    const attMap: Record<string, any> = {};
    attendance?.forEach(a => { attMap[a.user_id] = a; });

    const members: TeamMemberStatus[] = (profiles || []).map(p => ({
      id: p.id, full_name: p.full_name, role: roleMap[p.id] || 'editor',
      avatar_url: p.avatar_url,
      is_online: (p as any).is_online || false,
      last_seen: (p as any).last_seen || null,
      login_time: attMap[p.id]?.login_time || null,
      status: attMap[p.id]?.status || null,
    }));

    setTeam(members);
    setLoading(false);
  };

  const getPresence = (member: TeamMemberStatus) => {
    if (member.is_online && member.last_seen) {
      const diff = (Date.now() - new Date(member.last_seen).getTime()) / 60000;
      if (diff < 10) return { ring: 'ring-success', dot: 'bg-success', label: 'Online' };
      if (diff < 30) return { ring: 'ring-warning', dot: 'bg-warning', label: 'Away' };
    }
    return { ring: 'ring-muted-foreground/30', dot: 'bg-muted-foreground/30', label: 'Offline' };
  };

  const getLiveHours = (loginTime: string | null) => {
    if (!loginTime) return null;
    const diff = (Date.now() - new Date(loginTime).getTime()) / 3600000;
    const h = Math.floor(diff);
    const m = Math.floor((diff - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) return (
    <div className="glass-card p-5 space-y-3">
      <h2 className="text-lg font-display font-semibold text-foreground">Team Live Status</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />)}
      </div>
    </div>
  );

  return (
    <div className="glass-card p-5 space-y-3">
      <h2 className="text-lg font-display font-semibold text-foreground">Team Live Status</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {team.map(member => {
          const presence = getPresence(member);
          const liveHours = getLiveHours(member.login_time);
          return (
            <div key={member.id} className={cn('p-3 rounded-lg bg-muted/20 space-y-2', !member.login_time && 'border-l-2 border-l-destructive/60')}>
              <div className="flex items-center gap-2">
                <div className={cn('h-9 w-9 rounded-full ring-2 flex items-center justify-center text-xs font-bold bg-primary/20 text-primary', presence.ring)}>
                  {member.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[member.role] || member.role}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                {member.login_time ? (
                  <span className={member.status === 'late' ? 'text-warning' : 'text-success'}>
                    In at {new Date(member.login_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    {member.status === 'late' && ' ⚠️'}
                  </span>
                ) : <span className="text-destructive">Not logged in</span>}
                {liveHours && <span className="text-muted-foreground">{liveHours}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
