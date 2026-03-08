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
import { PenTool, ExternalLink, Loader2, Calendar, Clock, FolderOpen, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
      // Fetch raw footage links for tasks with video_id
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
    { label: 'Active', tasks: tasks.filter(t => activeStatuses.includes(t.status as WritingTaskStatus)) },
    { label: 'For Review', tasks: tasks.filter(t => reviewStatuses.includes(t.status as WritingTaskStatus)) },
    { label: 'Approved', tasks: tasks.filter(t => approvedStatuses.includes(t.status as WritingTaskStatus)) },
  ];

  const getDurationBarPct = (target: number | null, script: number | null) => {
    if (!target || !script) return 0;
    return Math.min(100, (script / target) * 100);
  };

  const getDurationBarColor = (target: number | null, script: number | null) => {
    if (!script) return 'bg-muted-foreground/30';
    if (!target) return 'bg-primary';
    const ratio = script / target;
    if (ratio >= 0.9 && ratio <= 1.1) return 'bg-success';
    return 'bg-warning';
  };

  return (
    <WriterLayout>
      <div className="space-y-6">
        <MyPerformance role="writer" />
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">My Writing Tasks</h1>
          <p className="text-muted-foreground mt-1">{tasks.length} active task{tasks.length !== 1 ? 's' : ''} assigned to you</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <PenTool size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No writing tasks assigned to you yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => group.tasks.length > 0 && (
              <div key={group.label}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{group.label}</h2>
                <div className="space-y-2">
                  {group.tasks.map(task => {
                    const isOverdue = task.due_date && task.due_date < today;
                    const pct = getDurationBarPct(task.target_duration_seconds, task.script_duration_seconds);
                    const barColor = getDurationBarColor(task.target_duration_seconds, task.script_duration_seconds);
                    return (
                      <div key={task.id} onClick={() => openTask(task)}
                        className={cn('glass-card-hover p-4 cursor-pointer space-y-2', selectedTask?.id === task.id && 'ring-1 ring-primary')}>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground truncate">{task.title}</p>
                              <span className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded flex-shrink-0">{taskTypeLabel(task.task_type)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{task.client_name}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <StatusBadge status={task.status as WritingTaskStatus} type="writing" />
                            {task.due_date && (
                              <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                <Calendar size={10} />
                                {new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Duration bar */}
                        {task.target_duration_seconds && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock size={9} /> Duration</span>
                              <span>
                                {task.script_duration_seconds ? formatDurationShort(task.script_duration_seconds) : '—'} / {formatDurationShort(task.target_duration_seconds)}
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}

                        {/* Raw footage link if available */}
                        {task.raw_footage_link && (
                          <a href={task.raw_footage_link} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:underline">
                            <FolderOpen size={10} /> Raw Footage →
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
            <div className="p-4 border-b border-glass-border flex items-start justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">{selectedTask.title}</h2>
                <p className="text-xs text-muted-foreground">{selectedTask.client_name}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Duration card */}
              {selectedTask.target_duration_seconds && (
                <div className="p-3 bg-primary/10 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Target Duration</p>
                      <p className="text-lg font-bold text-primary">{formatDuration(selectedTask.target_duration_seconds)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Script Duration</p>
                      <p className="text-lg font-bold text-foreground">
                        {selectedTask.script_duration_seconds ? formatDuration(selectedTask.script_duration_seconds) : '—'}
                      </p>
                    </div>
                  </div>
                  {/* Inline edit script duration */}
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number" min="0"
                      value={scriptDuration}
                      onChange={e => setScriptDuration(e.target.value)}
                      placeholder="sec"
                      className="h-7 text-xs flex-1"
                    />
                    <span className="text-xs text-muted-foreground">sec</span>
                    <Button size="sm" variant="outline" onClick={() => handleSaveScriptDuration(selectedTask.id)}
                      disabled={savingDuration} className="h-7 px-2 gap-1">
                      {savingDuration ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                      Save
                    </Button>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Status</p>
                <div className="space-y-1">
                  {WRITING_TASK_STATUS_ORDER.map((s, i) => {
                    const currentIdx = WRITING_TASK_STATUS_ORDER.indexOf(selectedTask.status as WritingTaskStatus);
                    const isCurrent = s === selectedTask.status;
                    const isPast = i < currentIdx;
                    return (
                      <button key={s} onClick={() => handleStatusChange(selectedTask.id, s)}
                        className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:bg-muted/30',
                          isCurrent && 'bg-primary/20 text-primary font-semibold',
                          isPast && 'text-muted-foreground',
                          !isCurrent && !isPast && 'text-foreground/70',
                        )}>
                        <span className={cn('h-2 w-2 rounded-full', isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-muted-foreground/30')} />
                        {WRITING_TASK_STATUSES[s].emoji} {WRITING_TASK_STATUSES[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Google Doc Link</Label>
                <Input value={docLink} onChange={e => setDocLink(e.target.value)} placeholder="https://docs.google.com/…" className="text-xs h-8" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Version Notes</Label>
                <textarea value={versionNotes} onChange={e => setVersionNotes(e.target.value)} rows={4} placeholder="Notes on this draft…" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground resize-none" />
              </div>

              <Button size="sm" onClick={handleSave} disabled={saving} className="w-full gap-2">
                {saving && <Loader2 size={12} className="animate-spin" />}
                Save
              </Button>

              {selectedTask.doc_link && (
                <a href={selectedTask.doc_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink size={10} /> Open Google Doc
                </a>
              )}
              {selectedTask.raw_footage_link && (
                <a href={selectedTask.raw_footage_link} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:underline">
                  <FolderOpen size={10} /> Raw Footage →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </WriterLayout>
  );
}
