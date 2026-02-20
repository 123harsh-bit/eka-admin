import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ChevronRight, TrendingUp, CheckCircle, Clock, FileText } from 'lucide-react';

interface MemberPerf {
  id: string;
  full_name: string;
  role: string;
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
  breakdown: { clientName: string; assigned: number; completed: number; inProgress: number }[];
}

const ROLE_COLORS: Record<string, string> = {
  editor: 'text-blue-400 bg-blue-500/20',
  designer: 'text-pink-400 bg-pink-500/20',
  writer: 'text-green-400 bg-green-500/20',
  admin: 'text-primary bg-primary/20',
};

const ROLE_LABELS: Record<string, string> = {
  editor: 'Video Editor',
  designer: 'Graphic Designer',
  writer: 'Content Writer',
  admin: 'Managing Director',
};

export function TeamPerformanceGrid() {
  const [members, setMembers] = useState<MemberPerf[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchPerformance(); }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'in', '("client","admin")');
    if (!roles?.length) { setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => { profileMap[p.id] = p.full_name; });

    const roleMap: Record<string, string> = {};
    roles.forEach(r => { roleMap[r.user_id] = r.role; });

    const results: MemberPerf[] = [];

    for (const r of roles) {
      const role = r.role;
      const userId = r.user_id;
      let tasks: { status: string; client_id: string; updated_at: string }[] = [];

      if (role === 'editor') {
        const { data } = await supabase.from('videos').select('status, client_id, updated_at').eq('assigned_editor', userId);
        tasks = data || [];
      } else if (role === 'designer') {
        const { data } = await supabase.from('design_tasks').select('status, client_id, updated_at').eq('assigned_designer', userId);
        tasks = data || [];
      } else if (role === 'writer') {
        const { data } = await supabase.from('writing_tasks').select('status, client_id, updated_at').eq('assigned_writer', userId);
        tasks = data || [];
      }

      const completedStatuses = role === 'editor' ? ['live', 'approved'] : ['delivered'];
      const notStartedStatuses = role === 'editor' ? ['idea', 'scripting'] : ['briefed'];

      const completed = tasks.filter(t => completedStatuses.includes(t.status) && t.updated_at >= startOfMonth).length;
      const inProgress = tasks.filter(t => !completedStatuses.includes(t.status) && !notStartedStatuses.includes(t.status)).length;
      const notStarted = tasks.filter(t => notStartedStatuses.includes(t.status)).length;

      // Breakdown by client
      const clientIds = [...new Set(tasks.map(t => t.client_id))];
      const { data: clientNames } = await supabase.from('clients').select('id, name').in('id', clientIds);
      const clientNameMap: Record<string, string> = {};
      clientNames?.forEach(c => { clientNameMap[c.id] = c.name; });

      const breakdown = clientIds.map(cid => {
        const clientTasks = tasks.filter(t => t.client_id === cid);
        return {
          clientName: clientNameMap[cid] || 'Unknown',
          assigned: clientTasks.length,
          completed: clientTasks.filter(t => completedStatuses.includes(t.status) && t.updated_at >= startOfMonth).length,
          inProgress: clientTasks.filter(t => !completedStatuses.includes(t.status) && !notStartedStatuses.includes(t.status)).length,
        };
      });

      results.push({
        id: userId,
        full_name: profileMap[userId] || 'Unknown',
        role,
        completed,
        inProgress,
        notStarted,
        total: tasks.length,
        breakdown,
      });
    }

    setMembers(results);
    setLoading(false);
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-display font-semibold text-foreground">Team Performance — {monthName}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (members.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <TrendingUp size={18} className="text-primary" />
        Team Performance — {monthName}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => {
          const pct = member.total > 0 ? Math.round((member.completed / member.total) * 100) : 0;
          const isExpanded = expanded === member.id;
          return (
            <div key={member.id} className="glass-card-hover overflow-hidden">
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : member.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {member.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.full_name}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', ROLE_COLORS[member.role])}>
                      {ROLE_LABELS[member.role] || member.role}
                    </span>
                  </div>
                  <ChevronRight size={14} className={cn('text-muted-foreground transition-transform', isExpanded && 'rotate-90')} />
                </div>

                {/* Mini progress bar */}
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-success"><CheckCircle size={10} /> {member.completed}</span>
                  <span className="flex items-center gap-1 text-primary"><Clock size={10} /> {member.inProgress}</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><FileText size={10} /> {member.notStarted}</span>
                </div>
              </div>

              {isExpanded && member.breakdown.length > 0 && (
                <div className="px-4 pb-4 border-t border-glass-border pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1">Client</th>
                        <th className="text-center py-1">Assigned</th>
                        <th className="text-center py-1">Done</th>
                        <th className="text-center py-1">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {member.breakdown.map(b => (
                        <tr key={b.clientName} className="text-foreground/80">
                          <td className="py-1 truncate max-w-[100px]">{b.clientName}</td>
                          <td className="text-center py-1">{b.assigned}</td>
                          <td className="text-center py-1 text-success">{b.completed}</td>
                          <td className="text-center py-1 text-primary">{b.inProgress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
