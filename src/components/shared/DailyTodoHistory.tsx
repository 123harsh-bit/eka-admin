import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface DailyTodo {
  id: string; title: string; priority: string; is_complete: boolean;
  original_date: string; carried_over_from: string | null;
}

interface DaySummary {
  date: string; total: number; completed: number; carriedOver: number;
  todos: DailyTodo[];
}

export function DailyTodoHistory({ userId }: { userId: string }) {
  const [allTodos, setAllTodos] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchHistory = async () => {
      setLoading(true);
      const thirtyDaysAgo = subDays(new Date(), 90).toISOString().split('T')[0];
      const { data } = await supabase.from('daily_todos').select('id, title, priority, is_complete, original_date, carried_over_from')
        .eq('admin_id', userId).gte('original_date', thirtyDaysAgo)
        .order('original_date', { ascending: false });
      if (data) setAllTodos(data as DailyTodo[]);
      setLoading(false);
    };
    fetchHistory();
  }, [userId]);

  const daySummaries = useMemo(() => {
    const grouped: Record<string, DailyTodo[]> = {};
    allTodos.forEach(t => {
      if (!grouped[t.original_date]) grouped[t.original_date] = [];
      grouped[t.original_date].push(t);
    });
    return Object.entries(grouped).map(([date, todos]) => ({
      date,
      total: todos.length,
      completed: todos.filter(t => t.is_complete).length,
      carriedOver: todos.filter(t => !t.is_complete).length,
      todos,
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [allTodos]);

  // Calendar heatmap data for last 90 days
  const heatmapDays = useMemo(() => {
    const end = new Date();
    const start = subDays(end, 89);
    const days = eachDayOfInterval({ start, end });
    const todoMap: Record<string, { total: number; completed: number }> = {};
    allTodos.forEach(t => {
      if (!todoMap[t.original_date]) todoMap[t.original_date] = { total: 0, completed: 0 };
      todoMap[t.original_date].total++;
      if (t.is_complete) todoMap[t.original_date].completed++;
    });
    return days.map(d => {
      const key = d.toISOString().split('T')[0];
      const data = todoMap[key];
      return { date: key, ...data };
    });
  }, [allTodos]);

  const getHeatmapColor = (day: { total?: number; completed?: number }) => {
    if (!day.total) return 'bg-muted/30';
    const ratio = (day.completed || 0) / day.total;
    if (ratio === 1) return 'bg-success';
    if (ratio > 0.5) return 'bg-success/50';
    if (ratio > 0) return 'bg-warning/50';
    return 'bg-destructive/50';
  };

  const getStatusBadge = (summary: DaySummary) => {
    if (summary.total === 0) return null;
    if (summary.completed === summary.total) return <span className="text-[10px] bg-success/20 text-success px-1.5 py-0.5 rounded-full">🟢 All Done</span>;
    if (summary.completed > 0) return <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded-full">🟡 Partial</span>;
    return <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">🔴 Missed</span>;
  };

  if (loading) {
    return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="glass-card h-12 animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="glass-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Completion Heatmap — Last 90 Days</h3>
        <div className="flex flex-wrap gap-1">
          {heatmapDays.map(day => (
            <div key={day.date} title={`${format(new Date(day.date + 'T00:00:00'), 'MMM d')} — ${day.total ? `${day.completed}/${day.total} tasks` : 'No tasks'}`}
              className={cn('h-3 w-3 rounded-sm cursor-default transition-colors', getHeatmapColor(day))} />
          ))}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-muted/30" /> No tasks</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/50" /> None done</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warning/50" /> Partial</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success/50" /> Most done</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-success" /> All done</span>
        </div>
      </div>

      {/* Day list */}
      <div className="space-y-2">
        {daySummaries.length === 0 ? (
          <div className="glass-card p-8 text-center text-muted-foreground">No task history yet.</div>
        ) : daySummaries.map(summary => (
          <div key={summary.date} className="glass-card overflow-hidden">
            <button onClick={() => setExpandedDay(expandedDay === summary.date ? null : summary.date)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{format(new Date(summary.date + 'T00:00:00'), 'EEEE, MMM d')}</span>
                {getStatusBadge(summary)}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{summary.completed} of {summary.total} completed</span>
                <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${summary.total ? (summary.completed / summary.total) * 100 : 0}%` }} />
                </div>
                {expandedDay === summary.date ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </button>
            {expandedDay === summary.date && (
              <div className="px-4 pb-4 space-y-1.5">
                {summary.todos.map(t => (
                  <div key={t.id} className={cn('flex items-center gap-2 text-sm p-2 rounded-lg', t.is_complete ? 'text-muted-foreground' : 'text-foreground')}>
                    {t.is_complete ? <Check size={12} className="text-success flex-shrink-0" /> : <Clock size={12} className="text-warning flex-shrink-0" />}
                    <span className={t.is_complete ? 'line-through' : ''}>{t.title}</span>
                    {t.carried_over_from && (
                      <span className="text-[10px] bg-warning/20 text-warning px-1 py-0.5 rounded ml-auto flex-shrink-0">
                        from {format(new Date(t.carried_over_from + 'T00:00:00'), 'MMM d')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
