import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { DailyTodoHistory } from '@/components/shared/DailyTodoHistory';
import { Plus, Check, ArrowRight, Calendar, PartyPopper, Clock, Loader2, ChevronDown, ChevronUp, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';

interface DailyTodo {
  id: string; title: string; priority: string; is_complete: boolean;
  original_date: string; carried_over_from: string | null;
  created_at: string; completed_at: string | null;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'border-l-destructive', medium: 'border-l-warning', low: 'border-l-muted-foreground',
};

export function DailyTasksContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todos, setTodos] = useState<DailyTodo[]>([]);
  const [yesterdayTodos, setYesterdayTodos] = useState<DailyTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [adding, setAdding] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showYesterday, setShowYesterday] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = subDays(new Date(), 1).toISOString().split('T')[0];

  useEffect(() => {
    fetchTodos();
    fetchYesterday();
    const hour = new Date().getHours();
    if (hour >= 18) setShowCheckin(true);
    const channel = supabase
      .channel('my-daily-todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_todos' }, fetchTodos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchTodos = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('daily_todos').select('*')
      .eq('admin_id', user.id).eq('original_date', today)
      .order('created_at', { ascending: true });
    if (data) setTodos(data as DailyTodo[]);
    setLoading(false);
  };

  const fetchYesterday = async () => {
    if (!user) return;
    const { data } = await supabase.from('daily_todos').select('*')
      .eq('admin_id', user.id).eq('original_date', yesterday)
      .order('created_at', { ascending: true });
    if (data) setYesterdayTodos(data as DailyTodo[]);
  };

  const addTodo = async () => {
    if (!newTask.trim() || !user) return;
    setAdding(true);
    await supabase.from('daily_todos').insert({
      admin_id: user.id, title: newTask.trim(), priority: newPriority, original_date: today,
    });
    setNewTask(''); setNewPriority('medium');
    await fetchTodos();
    setAdding(false);
  };

  const toggleComplete = async (todo: DailyTodo) => {
    await supabase.from('daily_todos').update({
      is_complete: !todo.is_complete,
      completed_at: todo.is_complete ? null : new Date().toISOString(),
    }).eq('id', todo.id);
    await fetchTodos();
  };

  const moveToTomorrow = async (todo: DailyTodo) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await supabase.from('daily_todos').insert({
      admin_id: user!.id, title: todo.title, priority: todo.priority,
      original_date: tomorrowStr, carried_over_from: today,
    });
    await supabase.from('daily_todos').delete().eq('id', todo.id);
    await fetchTodos();
    toast({ title: 'Task moved to tomorrow' });
  };

  const completed = todos.filter(t => t.is_complete);
  const pending = todos.filter(t => !t.is_complete);
  const allDone = todos.length > 0 && pending.length === 0;
  const progress = todos.length > 0 ? (completed.length / todos.length) * 100 : 0;
  const yesterdayCompleted = yesterdayTodos.filter(t => t.is_complete).length;
  const yesterdayCarried = yesterdayTodos.filter(t => !t.is_complete).length;

  if (showHistory) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold gradient-text">Task History</h1>
          <Button variant="outline" onClick={() => setShowHistory(false)} className="gap-2">
            <ArrowRight size={14} className="rotate-180" /> Back to Today
          </Button>
        </div>
        <DailyTodoHistory userId={user?.id || ''} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">My Daily Tasks</h1>
          <p className="text-muted-foreground mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <Button variant="outline" onClick={() => setShowHistory(true)} className="gap-2">
          <History size={14} /> View History
        </Button>
      </div>

      {/* Yesterday summary */}
      {yesterdayTodos.length > 0 && (
        <div className="glass-card overflow-hidden">
          <button onClick={() => setShowYesterday(!showYesterday)}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Yesterday — {format(subDays(new Date(), 1), 'MMM d')}</span>
              <span className="text-xs text-muted-foreground">
                {yesterdayCompleted} of {yesterdayTodos.length} completed
                {yesterdayCarried > 0 && ` · ${yesterdayCarried} carried over`}
              </span>
            </div>
            {showYesterday ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showYesterday && (
            <div className="px-4 pb-4 space-y-2">
              {yesterdayTodos.map(t => (
                <div key={t.id} className={cn('flex items-center gap-2 text-sm p-2 rounded-lg', t.is_complete ? 'text-muted-foreground' : 'text-foreground')}>
                  {t.is_complete ? <Check size={12} className="text-success" /> : <Clock size={12} className="text-warning" />}
                  <span className={t.is_complete ? 'line-through' : ''}>{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress */}
      {todos.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{completed.length} of {todos.length} done today</span>
            <span className="font-semibold text-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {allDone && (
        <div className="glass-card p-6 text-center bg-success/10 border-success/30">
          <PartyPopper size={32} className="mx-auto text-success mb-2" />
          <p className="font-display font-semibold text-foreground">All tasks completed today! 🎉</p>
        </div>
      )}

      {/* 6PM Check-in */}
      {showCheckin && pending.length > 0 && (
        <div className="glass-card p-5 border-warning/40 bg-warning/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-warning" />
              <h3 className="font-display font-semibold text-foreground">End of Day Check-in</h3>
            </div>
            <button onClick={() => setShowCheckin(false)} className="text-muted-foreground hover:text-foreground text-sm">Dismiss</button>
          </div>
          <p className="text-sm text-muted-foreground">✅ {completed.length} tasks completed · ⏳ {pending.length} tasks still pending</p>
          <div className="space-y-2">
            {pending.map(todo => (
              <div key={todo.id} className="flex items-center gap-2 bg-muted/30 rounded-lg p-3">
                <p className="flex-1 text-sm text-foreground">{todo.title}</p>
                <Button size="sm" variant="outline" onClick={() => toggleComplete(todo)} className="gap-1 text-xs h-7"><Check size={12} /> Done</Button>
                <Button size="sm" variant="ghost" onClick={() => moveToTomorrow(todo)} className="gap-1 text-xs h-7"><ArrowRight size={12} /> Tomorrow</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <Input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a task for today..."
            className="flex-1" onKeyDown={e => e.key === 'Enter' && addTodo()} />
          <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
          <Button onClick={addTodo} disabled={adding || !newTask.trim()} className="gap-2">
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </Button>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-14 animate-pulse" />)}</div>
      ) : todos.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No tasks for today. Add one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.filter(t => t.carried_over_from).map(todo => (
            <div key={todo.id} className={cn('glass-card p-4 flex items-center gap-3 border-l-4',
              PRIORITY_COLORS[todo.priority], todo.is_complete && 'opacity-60')}>
              <button onClick={() => toggleComplete(todo)} className={cn('h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                todo.is_complete ? 'border-success bg-success' : 'border-muted-foreground hover:border-primary')}>
                {todo.is_complete && <Check size={12} className="text-success-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm text-foreground', todo.is_complete && 'line-through')}>{todo.title}</p>
                <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                  Carried over from {format(new Date(todo.carried_over_from + 'T00:00:00'), 'MMM d')}
                </span>
              </div>
              {!todo.is_complete && (
                <Button size="sm" variant="ghost" onClick={() => moveToTomorrow(todo)} className="text-xs h-7 gap-1">
                  <ArrowRight size={12} /> Tomorrow
                </Button>
              )}
            </div>
          ))}
          {todos.filter(t => !t.carried_over_from).map(todo => (
            <div key={todo.id} className={cn('glass-card p-4 flex items-center gap-3 border-l-4',
              PRIORITY_COLORS[todo.priority], todo.is_complete && 'opacity-60')}>
              <button onClick={() => toggleComplete(todo)} className={cn('h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                todo.is_complete ? 'border-success bg-success' : 'border-muted-foreground hover:border-primary')}>
                {todo.is_complete && <Check size={12} className="text-success-foreground" />}
              </button>
              <p className={cn('flex-1 text-sm text-foreground', todo.is_complete && 'line-through')}>{todo.title}</p>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize',
                todo.priority === 'high' ? 'bg-destructive/20 text-destructive' :
                todo.priority === 'medium' ? 'bg-warning/20 text-warning' : 'bg-muted text-muted-foreground'
              )}>{todo.priority}</span>
              {!todo.is_complete && (
                <Button size="sm" variant="ghost" onClick={() => moveToTomorrow(todo)} className="text-xs h-7 gap-1">
                  <ArrowRight size={12} /> Tomorrow
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
