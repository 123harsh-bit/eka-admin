import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';

interface PerformanceData {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
  breakdown: { clientName: string; assigned: number; completed: number; inProgress: number }[];
}

interface MyPerformanceProps {
  role: 'editor' | 'designer' | 'writer';
}

export function MyPerformance({ role }: MyPerformanceProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchPerformance();
  }, [user]);

  const fetchPerformance = async () => {
    if (!user) return;
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    let tasks: { status: string; client_id: string; updated_at: string }[] = [];

    if (role === 'editor') {
      const { data: d } = await supabase.from('videos').select('status, client_id, updated_at').eq('assigned_editor', user.id);
      tasks = d || [];
    } else if (role === 'designer') {
      const { data: d } = await supabase.from('design_tasks').select('status, client_id, updated_at').eq('assigned_designer', user.id);
      tasks = d || [];
    } else if (role === 'writer') {
      const { data: d } = await supabase.from('writing_tasks').select('status, client_id, updated_at').eq('assigned_writer', user.id);
      tasks = d || [];
    }

    const completedStatuses = role === 'editor' ? ['live', 'approved'] : ['delivered'];
    const notStartedStatuses = role === 'editor' ? ['idea', 'scripting'] : ['briefed'];

    const completed = tasks.filter(t => completedStatuses.includes(t.status) && t.updated_at >= startOfMonth).length;
    const inProgress = tasks.filter(t => !completedStatuses.includes(t.status) && !notStartedStatuses.includes(t.status)).length;
    const notStarted = tasks.filter(t => notStartedStatuses.includes(t.status)).length;

    const clientIds = [...new Set(tasks.map(t => t.client_id))];
    const { data: clientNames } = await supabase.from('clients').select('id, name').in('id', clientIds.length > 0 ? clientIds : ['none']);
    const clientNameMap: Record<string, string> = {};
    clientNames?.forEach(c => { clientNameMap[c.id] = c.name; });

    const breakdown = clientIds.map(cid => {
      const ct = tasks.filter(t => t.client_id === cid);
      return {
        clientName: clientNameMap[cid] || 'Unknown',
        assigned: ct.length,
        completed: ct.filter(t => completedStatuses.includes(t.status) && t.updated_at >= startOfMonth).length,
        inProgress: ct.filter(t => !completedStatuses.includes(t.status) && !notStartedStatuses.includes(t.status)).length,
      };
    });

    setData({ completed, inProgress, notStarted, total: tasks.length, breakdown });
    setLoading(false);
  };

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' });

  if (loading) {
    return (
      <div className="glass-card p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-20 bg-muted/50 animate-pulse rounded" />
      </div>
    );
  }

  if (!data) return null;

  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp size={18} className="text-primary" />
        <h2 className="font-display font-semibold text-foreground">My Performance — {monthName}</h2>
      </div>

      {/* Hero stat */}
      <div className="text-center py-2">
        <p className="text-5xl font-display font-bold text-foreground">{data.completed}</p>
        <p className="text-sm text-muted-foreground mt-1">Tasks Delivered in {monthName}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-success/10 rounded-xl p-3 text-center">
          <CheckCircle size={16} className="text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{data.completed}</p>
          <p className="text-[10px] text-muted-foreground">Completed</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <Clock size={16} className="text-primary mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{data.inProgress}</p>
          <p className="text-[10px] text-muted-foreground">In Progress</p>
        </div>
        <div className="bg-muted rounded-xl p-3 text-center">
          <FileText size={16} className="text-muted-foreground mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{data.notStarted}</p>
          <p className="text-[10px] text-muted-foreground">Not Started</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data.completed} of {data.total} tasks completed</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Breakdown table */}
      {data.breakdown.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Client</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-glass-border">
                <th className="text-left py-1.5">Client</th>
                <th className="text-center py-1.5">Assigned</th>
                <th className="text-center py-1.5">Completed</th>
                <th className="text-center py-1.5">In Progress</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map(b => (
                <tr key={b.clientName} className="border-b border-glass-border/30">
                  <td className="py-1.5 text-foreground">{b.clientName}</td>
                  <td className="text-center py-1.5">{b.assigned}</td>
                  <td className="text-center py-1.5 text-success">{b.completed}</td>
                  <td className="text-center py-1.5 text-primary">{b.inProgress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">Resets on the 1st of each month</p>
    </div>
  );
}
