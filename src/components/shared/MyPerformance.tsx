import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceData {
  completed: number;
  inProgress: number;
  notStarted: number;
  total: number;
  breakdown: { clientName: string; assigned: number; completed: number; inProgress: number }[];
}

interface MyPerformanceProps {
  role: 'editor' | 'designer' | 'writer' | 'camera_operator';
}

export function MyPerformance({ role }: MyPerformanceProps) {
  const { user } = useAuth();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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
    } else if (role === 'camera_operator') {
      const { data: d } = await supabase.from('videos').select('status, client_id, updated_at').eq('assigned_camera_operator', user.id);
      tasks = d || [];
    }

    const completedStatuses = (role === 'editor' || role === 'camera_operator') ? ['live', 'approved', 'footage_delivered'] : ['delivered'];
    const notStartedStatuses = (role === 'editor' || role === 'camera_operator') ? ['idea', 'scripting'] : ['briefed'];

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
      <div className="glass-card p-4">
        <div className="h-5 w-40 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!data) return null;

  const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

  return (
    <div className="glass-card p-4 space-y-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Performance — {monthName}</h2>
        </div>
        <span className="text-[10px] text-muted-foreground">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {/* Compact stats row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-success" />
            <span className="text-lg font-bold text-foreground">{data.completed}</span>
            <span className="text-[10px] text-muted-foreground">Done</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{data.inProgress}</span>
            <span className="text-[10px] text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText size={12} className="text-muted-foreground" />
            <span className="text-lg font-bold text-foreground">{data.notStarted}</span>
            <span className="text-[10px] text-muted-foreground">Queue</span>
          </div>
        </div>
        <div className="flex-1 ml-4">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{data.completed}/{data.total}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && data.breakdown.length > 0 && (
        <div className="pt-2 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">By Client</p>
          <div className="space-y-1.5">
            {data.breakdown.map(b => (
              <div key={b.clientName} className="flex items-center justify-between text-xs p-2 bg-muted/20 rounded-lg">
                <span className="text-foreground font-medium">{b.clientName}</span>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-muted-foreground">{b.assigned} total</span>
                  <span className="text-success">{b.completed} done</span>
                  <span className="text-primary">{b.inProgress} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}