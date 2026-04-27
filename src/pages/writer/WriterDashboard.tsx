import { useState, useEffect } from 'react';
import { WriterLayout } from '@/components/writer/WriterLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MyPerformance } from '@/components/shared/MyPerformance';
import { WRITING_TASK_STATUSES, WRITING_TASK_STATUS_ORDER, WRITING_TASK_TYPES, formatDuration, formatDurationShort, type WritingTaskStatus } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenTool, ExternalLink, Loader2, Calendar, Clock, FolderOpen, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface WritingTask {
  id: string; title: string; task_type: string; status: string;
  client_id: string; due_date: string | null; doc_link: string | null;
  target_duration_seconds: number | null; script_duration_seconds: number | null;
  version_notes: string | null; video_id: string | null;
  client_name?: string; raw_footage_link?: string | null;
}

const taskTypeLabel = (type: string) => WRITING_TASK_TYPES.find(t => t.value === type)?.label || type;

export default function WriterDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WritingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<WritingTask | null>(null);
  const [docLink, setDocLink] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [scriptDuration, setScriptDuration] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel('writer-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'writing_tasks', filter: `assigned_writer=eq.${user?.id}` }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('writing_tasks')
      .select('id, title, task_type, status, client_id, due_date, doc_link, target_duration_seconds, script_duration_seconds, version_notes, video_id, clients(name)')
      .eq('assigned_writer', user.id)
      .not('status', 'eq', 'delivered')
      .order('due_date', { ascending: true, nullsFirst: false });
    if (data) {
      const mapped = (data as unknown[]).map((t: unknown) => {
        const row = t as Record<string, unknown>;
        return { ...(row as unknown as WritingTask), client_name: (row.clients as { name: string } | null)?.name || 'Unknown' };
      });
      setTasks(mapped);
      const videoIds = mapped.filter(t => t.video_id).map(t => t.video_id!);
      if (videoIds.length > 0) {
        const { data: videos } = await supabase.from('videos').select('id, raw_footage_link').in('id', videoIds);
        if (videos) {
          const linkMap: Record<string, string | null> = {};
          videos.forEach(v => { linkMap[v.id] = v.raw_footage_link; });
          setTasks(prev => prev.map(t => t.video_id ? { ...t, raw_footage_link: linkMap[t.video_id] || null } : t));
        }
      }
    }
    setLoading(false);
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await supabase.from('writing_tasks').update({ status }).eq('id', taskId);
    await fetchTasks();
    if (selectedTask?.id === taskId) setSelectedTask(t => t ? { ...t, status } : t);
    toast({ title: 'Status updated' });
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    await supabase.from('writing_tasks').update({
      doc_link: docLink || null,
      version_notes: versionNotes || null,
    }).eq('id', selectedTask.id);
    toast({ title: 'Saved' });
    await fetchTasks();
    setSaving(false);
  };

  const handleSaveScriptDuration = async (taskId: string) => {
    const secs = parseInt(scriptDuration);
    if (isNaN(secs) || secs < 0) return;
    setSavingDuration(true);
    await supabase.from('writing_tasks').update({ script_duration_seconds: secs }).eq('id', taskId);
    toast({ title: 'Script duration updated' });
    await fetchTasks();
    setSavingDuration(false);
  };

  const openTask = (t: WritingTask) => {
    setSelectedTask(t);
    setDocLink(t.doc_link || '');
    setVersionNotes(t.version_notes || '');
    setScriptDuration(t.script_duration_seconds?.toString() || '');
  };

  const today = new Date().toISOString().split('T')[0];
  const activeStatuses: WritingTaskStatus[] = ['briefed', 'drafting'];
  const reviewStatuses: WritingTaskStatus[] = ['review', 'revisions'];
  const approvedStatuses: WritingTaskStatus[] = ['approved'];

  const groups = [
    { label: 'Active', emoji: '🔵', tasks: tasks.filter(t => activeStatuses.includes(t.status as WritingTaskStatus)) },
    { label: 'For Review', emoji: '🔍', tasks: tasks.filter(t => reviewStatuses.includes(t.status as WritingTaskStatus)) },
    { label: 'Approved', emoji: '✅', tasks: tasks.filter(t => approvedStatuses.includes(t.status as WritingTaskStatus)) },
  ];

  return (
    <WriterLayout>
      <PullToRefresh onRefresh={fetchTasks}>
        <div className="space-y-5 max-w-5xl mx-auto">
          <MyPerformance role="writer" />

          <div>
            <h1 className="text-2xl font-bold text-foreground">My Writing Tasks</h1>
            <p className="text-sm text-muted-foreground">{tasks.length} active task{tasks.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <PenTool size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No writing tasks assigned yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => group.tasks.length > 0 && (
                <div key={group.label} className="space-y-2">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <span>{group.emoji}</span> {group.label} <span className="text-[10px] text-muted-foreground/60">{group.tasks.length}</span>
                  </h2>
                  <div className="space-y-1.5">
                    {group.tasks.map(task => {
                      const isOverdue = task.due_date && task.due_date < today;
                      const pct = task.target_duration_seconds && task.script_duration_seconds
                        ? Math.min(100, (task.script_duration_seconds / task.target_duration_seconds) * 100) : 0;
                      return (
                        <div key={task.id} onClick={() => openTask(task)}
                          className={cn('glass-card p-3 cursor-pointer space-y-2 group transition-all hover:bg-card/80', selectedTask?.id === task.id && 'ring-1 ring-primary')}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                                <span className="text-[9px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{taskTypeLabel(task.task_type)}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground">{task.client_name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={task.status as WritingTaskStatus} type="writing" />
                              {task.due_date && (
                                <span className={cn('text-[10px] flex items-center gap-1', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                  <Calendar size={9} />
                                  {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                            </div>
                          </div>
                          {task.target_duration_seconds && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock size={8} /> Duration</span>
                                <span>{task.script_duration_seconds ? formatDurationShort(task.script_duration_seconds) : '—'} / {formatDurationShort(task.target_duration_seconds)}</span>
                              </div>
                              <div className="h-1 bg-muted rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full transition-all', pct >= 90 && pct <= 110 ? 'bg-success' : 'bg-warning')} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          )}
                          {task.raw_footage_link && (
                            <a href={task.raw_footage_link} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                              <FolderOpen size={9} /> Raw Footage →
                            </a>
                          )}
                        </div>
                      );
                    })}
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
                  {selectedTask.target_duration_seconds && (
                    <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Target</p>
                          <p className="text-lg font-bold text-primary">{formatDuration(selectedTask.target_duration_seconds)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Script</p>
                          <p className="text-lg font-bold text-foreground">
                            {selectedTask.script_duration_seconds ? formatDuration(selectedTask.script_duration_seconds) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Input type="number" min="0" value={scriptDuration} onChange={e => setScriptDuration(e.target.value)}
                          placeholder="sec" className="h-7 text-xs flex-1" />
                        <span className="text-[10px] text-muted-foreground">sec</span>
                        <Button size="sm" variant="outline" onClick={() => handleSaveScriptDuration(selectedTask.id)}
                          disabled={savingDuration} className="h-7 px-2 gap-1">
                          {savingDuration ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />} Save
                        </Button>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                    <div className="space-y-0.5">
                      {WRITING_TASK_STATUS_ORDER.map((s, i) => {
                        const currentIdx = WRITING_TASK_STATUS_ORDER.indexOf(selectedTask.status as WritingTaskStatus);
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
                            {WRITING_TASK_STATUSES[s].emoji} {WRITING_TASK_STATUSES[s].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Google Doc Link</Label>
                    <Input value={docLink} onChange={e => setDocLink(e.target.value)} placeholder="https://docs.google.com/…" className="text-xs h-8" />
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
                    {selectedTask.doc_link && (
                      <a href={selectedTask.doc_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> Google Doc
                      </a>
                    )}
                    {selectedTask.raw_footage_link && (
                      <a href={selectedTask.raw_footage_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                        <FolderOpen size={10} /> Raw Footage
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </PullToRefresh>
    </WriterLayout>
  );
}