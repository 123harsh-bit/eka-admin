import { useState, useEffect } from 'react';
import { DesignerLayout } from '@/components/designer/DesignerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MyPerformance } from '@/components/shared/MyPerformance';
import { DESIGN_TASK_STATUSES, DESIGN_TASK_STATUS_ORDER, DESIGN_TASK_TYPES, type DesignTaskStatus } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Palette, ExternalLink, Loader2, Calendar, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface DesignTask {
  id: string; title: string; task_type: string; status: string;
  client_id: string; due_date: string | null; figma_link: string | null;
  drive_link: string | null; version_notes: string | null;
  client_name?: string;
}

const taskTypeLabel = (type: string) => DESIGN_TASK_TYPES.find(t => t.value === type)?.label || type;

export default function DesignerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<DesignTask | null>(null);
  const [figmaLink, setFigmaLink] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel('designer-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'design_tasks', filter: `assigned_designer=eq.${user?.id}` }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('design_tasks').select('*, clients(name)').eq('assigned_designer', user.id).not('status', 'eq', 'delivered').order('due_date', { ascending: true, nullsFirst: false });
    if (data) {
      setTasks((data as unknown[]).map((t: unknown) => {
        const row = t as Record<string, unknown>;
        return { ...(row as unknown as DesignTask), client_name: (row.clients as { name: string } | null)?.name || 'Unknown' };
      }));
    }
    setLoading(false);
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    const { error } = await supabase.from('design_tasks').update({ status }).eq('id', taskId);
    if (!error) {
      await fetchTasks();
      if (selectedTask?.id === taskId) setSelectedTask(t => t ? { ...t, status } : t);
      toast({ title: 'Status updated' });
    }
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    await supabase.from('design_tasks').update({
      figma_link: figmaLink || null,
      drive_link: driveLink || null,
      version_notes: versionNotes || null,
    }).eq('id', selectedTask.id);
    toast({ title: 'Saved' });
    await fetchTasks();
    setSaving(false);
  };

  const openTask = (t: DesignTask) => {
    setSelectedTask(t);
    setFigmaLink(t.figma_link || '');
    setDriveLink(t.drive_link || '');
    setVersionNotes(t.version_notes || '');
  };

  const columns = DESIGN_TASK_STATUS_ORDER.map(s => ({
    status: s, config: DESIGN_TASK_STATUSES[s],
    tasks: tasks.filter(t => t.status === s),
  }));

  const today = new Date().toISOString().split('T')[0];

  return (
    <DesignerLayout>
      <PullToRefresh onRefresh={fetchTasks}>
        <div className="space-y-5 max-w-7xl mx-auto">
          <MyPerformance role="designer" />

          <div>
            <h1 className="text-2xl font-bold text-foreground">My Design Tasks</h1>
            <p className="text-sm text-muted-foreground">{tasks.length} active task{tasks.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {DESIGN_TASK_STATUS_ORDER.map(s => (
                <div key={s} className="flex-shrink-0 w-56">
                  <div className="h-8 bg-muted/50 rounded animate-pulse mb-3" />
                  {[...Array(2)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse mb-2" />)}
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Palette size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No design tasks assigned yet.</p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {columns.map(col => (
                <div key={col.status} className="flex-shrink-0 w-56">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm">{col.config.emoji}</span>
                    <h3 className="text-xs font-semibold text-foreground">{col.config.label}</h3>
                    <span className="ml-auto text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{col.tasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {col.tasks.map(task => {
                      const isOverdue = task.due_date && task.due_date < today;
                      return (
                        <div key={task.id} onClick={() => openTask(task)}
                          className={cn('glass-card p-3 cursor-pointer space-y-1.5 transition-all hover:bg-card/80', selectedTask?.id === task.id && 'ring-1 ring-primary')}>
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[11px] font-medium text-foreground leading-tight">{task.title}</p>
                            <span className="text-[9px] bg-accent text-accent-foreground px-1 py-0.5 rounded flex-shrink-0">{taskTypeLabel(task.task_type)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{task.client_name}</p>
                          <div className="flex items-center gap-2">
                            {task.due_date && (
                              <span className={cn('text-[9px] flex items-center gap-1', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                <Calendar size={8} />
                                {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {task.figma_link && <span className="text-[9px] text-primary">Figma ✓</span>}
                          </div>
                        </div>
                      );
                    })}
                    {col.tasks.length === 0 && (
                      <div className="border border-dashed border-border rounded-xl p-4 text-center">
                        <p className="text-[10px] text-muted-foreground">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detail Panel */}
          {selectedTask && (
            <>
              <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={() => setSelectedTask(null)} />
              <div className="fixed right-0 top-0 h-full w-full sm:w-80 bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
                <div className="p-4 border-b border-border flex items-start justify-between">
                  <div>
                    <h2 className="font-semibold text-foreground text-sm">{selectedTask.title}</h2>
                    <p className="text-xs text-muted-foreground">{selectedTask.client_name}</p>
                  </div>
                  <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                    <div className="space-y-0.5">
                      {DESIGN_TASK_STATUS_ORDER.map((s, i) => {
                        const currentIdx = DESIGN_TASK_STATUS_ORDER.indexOf(selectedTask.status as DesignTaskStatus);
                        const isCurrent = s === selectedTask.status;
                        const isPast = i < currentIdx;
                        return (
                          <button key={s} onClick={() => handleStatusChange(selectedTask.id, s)}
                            className={cn('w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all hover:bg-muted/30',
                              isCurrent && 'bg-primary/15 text-primary font-semibold',
                              isPast && 'text-muted-foreground/60',
                              !isCurrent && !isPast && 'text-foreground/50',
                            )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-muted-foreground/20')} />
                            {DESIGN_TASK_STATUSES[s].emoji} {DESIGN_TASK_STATUSES[s].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Figma Link</Label>
                    <Input value={figmaLink} onChange={e => setFigmaLink(e.target.value)} placeholder="https://figma.com/…" className="text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Drive Link</Label>
                    <Input value={driveLink} onChange={e => setDriveLink(e.target.value)} placeholder="https://drive.google.com/…" className="text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Version Notes</Label>
                    <textarea value={versionNotes} onChange={e => setVersionNotes(e.target.value)} rows={3} placeholder="Notes…"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground resize-none" />
                  </div>

                  <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-2">
                    {saving && <Loader2 size={12} className="animate-spin" />} Save
                  </Button>

                  <div className="flex gap-3">
                    {selectedTask.figma_link && (
                      <a href={selectedTask.figma_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> Figma
                      </a>
                    )}
                    {selectedTask.drive_link && (
                      <a href={selectedTask.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> Drive
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
    </DesignerLayout>
  );
}