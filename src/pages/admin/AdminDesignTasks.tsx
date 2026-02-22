import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { DESIGN_TASK_STATUSES, DESIGN_TASK_STATUS_ORDER, DESIGN_TASK_TYPES, type DesignTaskStatus } from '@/lib/statusConfig';
import { Plus, Search, X, Palette, Edit2, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DesignTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
  client_id: string;
  assigned_designer: string | null;
  due_date: string | null;
  figma_link: string | null;
  drive_link: string | null;
  version_notes: string | null;
  video_id: string | null;
  created_at: string;
  client_name?: string;
  designer_name?: string;
}

interface Client { id: string; name: string; }
interface TeamMember { id: string; full_name: string; }

const emptyForm = {
  title: '', task_type: 'thumbnail', status: 'briefed', client_id: '',
  assigned_designer: '', due_date: '', figma_link: '', drive_link: '', version_notes: '',
};

export default function AdminDesignTasks() {
  const [tasks, setTasks] = useState<DesignTask[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [designers, setDesigners] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DesignTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; task: DesignTask | null }>({ open: false, task: null });
  const { toast } = useToast();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchTasks(), fetchClients(), fetchDesigners()]);
    setLoading(false);
  };

  const fetchTasks = async () => {
    const { data } = await supabase.from('design_tasks').select('*, clients(name), profiles(full_name)').order('created_at', { ascending: false });
    if (data) {
      setTasks((data as unknown[]).map((t: unknown) => {
        const row = t as Record<string, unknown>;
        return {
          ...(row as unknown as DesignTask),
          client_name: (row.clients as { name: string } | null)?.name || 'Unknown',
          designer_name: (row.profiles as { full_name: string } | null)?.full_name || null,
        };
      }));
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('is_active', true).order('name');
    if (data) setClients(data);
  };

  const fetchDesigners = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'designer');
    if (roles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
      if (profiles) setDesigners(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const openAdd = () => { setEditingTask(null); setForm({ ...emptyForm }); setPanelOpen(true); };
  const openEdit = (task: DesignTask) => {
    setEditingTask(task);
    setForm({
      title: task.title, task_type: task.task_type, status: task.status,
      client_id: task.client_id, assigned_designer: task.assigned_designer || '',
      due_date: task.due_date || '', figma_link: task.figma_link || '',
      drive_link: task.drive_link || '', version_notes: task.version_notes || '',
    });
    setPanelOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(), task_type: form.task_type, status: form.status,
        client_id: form.client_id, assigned_designer: form.assigned_designer || null,
        due_date: form.due_date || null, figma_link: form.figma_link || null,
        drive_link: form.drive_link || null, version_notes: form.version_notes || null,
      };
      if (editingTask) {
        const { error } = await supabase.from('design_tasks').update(payload).eq('id', editingTask.id);
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'design_task', entity_id: editingTask.id, action: 'updated', details: { title: form.title } });
        toast({ title: 'Design task updated' });
      } else {
        const { data, error } = await supabase.from('design_tasks').insert(payload).select().single();
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'design_task', entity_id: data.id, action: 'created', details: { title: form.title } });
        toast({ title: 'Design task added' });
      }
      await fetchTasks();
      setPanelOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.task) return;
    await supabase.from('design_tasks').delete().eq('id', deleteModal.task.id);
    await fetchTasks();
    toast({ title: 'Task deleted' });
    setDeleteModal({ open: false, task: null });
  };

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || t.status === statusFilter;
    const matchClient = !clientFilter || t.client_id === clientFilter;
    return matchSearch && matchStatus && matchClient;
  });

  const taskTypeLabel = (type: string) => DESIGN_TASK_TYPES.find(t => t.value === type)?.label || type;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Design Tasks</h1>
            <p className="text-muted-foreground mt-1">{tasks.length} total</p>
          </div>
          <Button onClick={openAdd} className="gap-2"><Plus size={16} /> Add Task</Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All statuses</option>
            {DESIGN_TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{DESIGN_TASK_STATUSES[s].label}</option>)}
          </select>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="glass-card overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/80 border-b border-glass-border">
              <tr>
                {['Task', 'Type', 'Client', 'Status', 'Designer', 'Due', 'Links', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider first:rounded-tl-xl last:rounded-tr-xl">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-7 bg-muted/50 rounded animate-pulse" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  <Palette size={32} className="mx-auto mb-2 opacity-40" />
                  No design tasks found.
                </td></tr>
              ) : filtered.map(task => (
                <tr key={task.id} className="border-b border-glass-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground max-w-48 truncate">{task.title}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{taskTypeLabel(task.task_type)}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.client_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={task.status as DesignTaskStatus} type="design" />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.designer_name || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {task.figma_link && <a href={task.figma_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink size={10} />Figma</a>}
                      {task.drive_link && <a href={task.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><ExternalLink size={10} />Drive</a>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(task)} className="p-1 hover:text-primary"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteModal({ open: true, task })} className="p-1 hover:text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">{editingTask ? 'Edit Task' : 'Add Design Task'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" required /></div>
              <div className="space-y-1.5">
                <Label>Task Type</Label>
                <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {DESIGN_TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Designer</Label>
                <select value={form.assigned_designer} onChange={e => setForm(f => ({ ...f, assigned_designer: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="">Unassigned</option>
                  {designers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {DESIGN_TASK_STATUS_ORDER.map(s => <option key={s} value={s}>{DESIGN_TASK_STATUSES[s].label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Figma Link</Label><Input value={form.figma_link} onChange={e => setForm(f => ({ ...f, figma_link: e.target.value }))} placeholder="https://figma.com/…" /></div>
              <div className="space-y-1.5"><Label>Drive Link</Label><Input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/…" /></div>
              <div className="space-y-1.5">
                <Label>Version Notes</Label>
                <textarea value={form.version_notes} onChange={e => setForm(f => ({ ...f, version_notes: e.target.value }))} rows={3} placeholder="Notes on current version…" className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
              </div>
            </form>
            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingTask ? 'Save Changes' : 'Add Task'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, task: null })} onConfirm={handleDelete} title="Delete Design Task" description={`Permanently delete "${deleteModal.task?.title}"?`} />
    </AdminLayout>
  );
}
