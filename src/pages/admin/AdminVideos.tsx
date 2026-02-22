import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { VIDEO_STATUSES, VIDEO_STATUS_ORDER, type VideoStatus } from '@/lib/statusConfig';
import { getDirectDownloadLink } from '@/lib/driveUtils';
import { Plus, Search, X, Video, Filter, Edit2, Trash2, ChevronRight, ExternalLink, MessageSquare, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VideoRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  client_id: string;
  assigned_editor: string | null;
  drive_link: string | null;
  live_url: string | null;
  internal_notes: string | null;
  is_internal_note_visible_to_client: boolean;
  date_planned: string | null;
  date_delivered: string | null;
  created_at: string;
  client_name?: string;
  editor_name?: string;
  feedback_count?: number;
}

interface Client { id: string; name: string; }
interface TeamMember { id: string; full_name: string; }
interface FeedbackItem { id: string; content: string | null; type: string; created_at: string; }

const emptyForm = {
  title: '', description: '', client_id: '', assigned_editor: '',
  status: 'idea', drive_link: '', live_url: '', internal_notes: '',
  is_internal_note_visible_to_client: false, date_planned: '', date_delivered: '',
};

export default function AdminVideos() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editors, setEditors] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailVideo, setDetailVideo] = useState<VideoRow | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; video: VideoRow | null }>({ open: false, video: null });
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('videos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, fetchVideos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchVideos(), fetchClients(), fetchEditors()]);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase.from('videos').select('*, clients(name), profiles(full_name)').order('created_at', { ascending: false });
    if (data) {
      const vids: VideoRow[] = (data as unknown[]).map((v: unknown) => {
        const row = v as Record<string, unknown>;
        return {
          ...(row as unknown as VideoRow),
          client_name: (row.clients as { name: string } | null)?.name || 'Unknown',
          editor_name: (row.profiles as { full_name: string } | null)?.full_name || null,
        };
      });
      // Get feedback counts
      const ids = vids.map(v => v.id);
      if (ids.length > 0) {
        const { data: fbData } = await supabase.from('feedback').select('video_id').in('video_id', ids);
        const fbCounts: Record<string, number> = {};
        fbData?.forEach(f => { fbCounts[f.video_id] = (fbCounts[f.video_id] || 0) + 1; });
        vids.forEach(v => { v.feedback_count = fbCounts[v.id] || 0; });
      }
      setVideos(vids);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').eq('is_active', true).order('name');
    if (data) setClients(data);
  };

  const fetchEditors = async () => {
    const { data: editorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'editor');
    if (editorRoles && editorRoles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', editorRoles.map(r => r.user_id));
      if (profiles) setEditors(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const openAdd = () => { setEditingVideo(null); setForm({ ...emptyForm }); setPanelOpen(true); setDetailVideo(null); };

  const openEdit = (video: VideoRow) => {
    setEditingVideo(video);
    setForm({
      title: video.title, description: video.description || '', client_id: video.client_id,
      assigned_editor: video.assigned_editor || '', status: video.status,
      drive_link: video.drive_link || '', live_url: video.live_url || '',
      internal_notes: video.internal_notes || '',
      is_internal_note_visible_to_client: video.is_internal_note_visible_to_client,
      date_planned: video.date_planned || '', date_delivered: video.date_delivered || '',
    });
    setPanelOpen(true);
    setDetailVideo(null);
  };

  const openDetail = async (video: VideoRow) => {
    setDetailVideo(video);
    const { data } = await supabase.from('feedback').select('*').eq('video_id', video.id).order('created_at', { ascending: false });
    setFeedback(data || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.client_id) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        client_id: form.client_id,
        assigned_editor: form.assigned_editor || null,
        status: form.status,
        drive_link: form.drive_link ? getDirectDownloadLink(form.drive_link) : null,
        live_url: form.live_url || null,
        internal_notes: form.internal_notes || null,
        is_internal_note_visible_to_client: form.is_internal_note_visible_to_client,
        date_planned: form.date_planned || null,
        date_delivered: form.date_delivered || null,
      };

      if (editingVideo) {
        const { error } = await supabase.from('videos').update(payload).eq('id', editingVideo.id);
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'video', entity_id: editingVideo.id, action: 'updated', details: { title: form.title } });
        toast({ title: 'Video updated' });
      } else {
        const { data, error } = await supabase.from('videos').insert(payload).select().single();
        if (error) throw error;
        await supabase.from('activity_log').insert({ entity_type: 'video', entity_id: data.id, action: 'created', details: { title: form.title } });
        toast({ title: 'Video added' });
      }
      await fetchVideos();
      setPanelOpen(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: err instanceof Error ? err.message : 'Something went wrong', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (videoId: string, newStatus: string) => {
    const { error } = await supabase.from('videos').update({ status: newStatus }).eq('id', videoId);
    if (!error) {
      await fetchVideos();
      if (detailVideo?.id === videoId) setDetailVideo(v => v ? { ...v, status: newStatus } : v);
      await supabase.from('activity_log').insert({ entity_type: 'video', entity_id: videoId, action: 'status_changed', details: { status: newStatus } });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.video) return;
    await supabase.from('videos').delete().eq('id', deleteModal.video.id);
    await fetchVideos();
    toast({ title: 'Video deleted' });
    setDeleteModal({ open: false, video: null });
    if (detailVideo?.id === deleteModal.video.id) setDetailVideo(null);
  };

  const handleResolveFeedback = async (fbId: string) => {
    await supabase.from('feedback').update({ is_resolved: true }).eq('id', fbId);
    setFeedback(prev => prev.map(f => f.id === fbId ? { ...f, is_resolved: true } : f));
  };

  const filtered = videos.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchClient = !clientFilter || v.client_id === clientFilter;
    return matchSearch && matchStatus && matchClient;
  });

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-6">
        {/* Main list */}
        <div className={cn('flex flex-col space-y-4', detailVideo ? 'flex-1 min-w-0' : 'w-full')}>
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">Videos</h1>
              <p className="text-muted-foreground mt-1">{videos.length} total</p>
            </div>
            <Button onClick={openAdd} className="gap-2"><Plus size={16} /> Add Video</Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap flex-shrink-0">
            <div className="relative flex-1 min-w-40">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9 text-sm" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">All statuses</option>
              {VIDEO_STATUS_ORDER.map(s => <option key={s} value={s}>{VIDEO_STATUSES[s].label}</option>)}
            </select>
            <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Table */}
          <div className="glass-card flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/90 backdrop-blur border-b border-glass-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Editor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Feedback</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Video size={32} className="mx-auto mb-2 opacity-40" />
                    No videos found.
                  </td></tr>
                ) : filtered.map(video => (
                  <tr
                    key={video.id}
                    onClick={() => openDetail(video)}
                    className={cn('border-b border-glass-border/50 cursor-pointer hover:bg-muted/30 transition-colors',
                      detailVideo?.id === video.id && 'bg-primary/10'
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{video.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{video.client_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={video.status as VideoStatus} type="video" />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{video.editor_name || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {video.feedback_count ? (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MessageSquare size={12} />{video.feedback_count}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(video)} className="p-1 hover:text-primary transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleteModal({ open: true, video })} className="p-1 hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {detailVideo && (
          <div className="w-80 flex-shrink-0 glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-glass-border flex items-start justify-between">
              <div>
                <h2 className="font-display font-semibold text-foreground text-sm">{detailVideo.title}</h2>
                <p className="text-xs text-muted-foreground">{detailVideo.client_name}</p>
              </div>
              <button onClick={() => setDetailVideo(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Status stepper */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                <div className="space-y-1">
                  {VIDEO_STATUS_ORDER.map((s, i) => {
                    const currentIdx = VIDEO_STATUS_ORDER.indexOf(detailVideo.status as VideoStatus);
                    const isPast = i < currentIdx;
                    const isCurrent = s === detailVideo.status;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(detailVideo.id, s)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all',
                          isCurrent && 'bg-primary/20 text-primary font-semibold',
                          isPast && 'text-muted-foreground',
                          !isCurrent && !isPast && 'text-foreground/50 hover:bg-muted/30',
                        )}
                      >
                        <span className={cn('h-2 w-2 rounded-full flex-shrink-0', isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-muted-foreground/30')} />
                        {VIDEO_STATUSES[s].emoji} {VIDEO_STATUSES[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Links */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Links</p>
                {detailVideo.drive_link ? (
                  <a href={detailVideo.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-primary hover:underline">
                    <ExternalLink size={12} /> Drive File
                  </a>
                ) : <p className="text-xs text-muted-foreground">No drive link</p>}
                {detailVideo.live_url && (
                  <a href={detailVideo.live_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-success hover:underline">
                    <ExternalLink size={12} /> Live URL
                  </a>
                )}
              </div>

              {/* Notes */}
              {detailVideo.internal_notes && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Internal Notes</p>
                  <p className="text-xs text-foreground/80 bg-muted/30 rounded-lg p-3">{detailVideo.internal_notes}</p>
                </div>
              )}

              {/* Feedback */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Client Feedback ({feedback.length})
                </p>
                {feedback.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No feedback yet.</p>
                ) : (
                  <div className="space-y-2">
                    {feedback.map(f => (
                      <div key={f.id} className={cn('p-3 rounded-lg text-xs', (f as FeedbackItem & { is_resolved?: boolean }).is_resolved ? 'bg-muted/20 opacity-60' : 'bg-muted/40')}>
                        <p className="text-foreground/80">{f.content || '[Voice note]'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-muted-foreground">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                          {!(f as FeedbackItem & { is_resolved?: boolean }).is_resolved && (
                            <button onClick={() => handleResolveFeedback(f.id)} className="text-success hover:underline">Resolve</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-glass-border">
              <Button size="sm" variant="outline" onClick={() => openEdit(detailVideo)} className="w-full gap-2">
                <Edit2 size={14} /> Edit Video
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Panel */}
      {panelOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setPanelOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-sidebar border-l border-sidebar-border z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-sidebar-border">
              <h2 className="text-xl font-display font-bold text-foreground">{editingVideo ? 'Edit Video' : 'Add Video'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Video title" required />
              </div>
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Editor</Label>
                <select value={form.assigned_editor} onChange={e => setForm(f => ({ ...f, assigned_editor: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="">Unassigned</option>
                  {editors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {VIDEO_STATUS_ORDER.map(s => <option key={s} value={s}>{VIDEO_STATUSES[s].label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date Planned</Label>
                  <Input type="date" value={form.date_planned} onChange={e => setForm(f => ({ ...f, date_planned: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date Delivered</Label>
                  <Input type="date" value={form.date_delivered} onChange={e => setForm(f => ({ ...f, date_delivered: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Drive Link</Label>
                <Input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/…" />
                <p className="text-xs text-muted-foreground">Auto-converted to direct download link</p>
              </div>
              <div className="space-y-1.5">
                <Label>Live URL</Label>
                <Input value={form.live_url} onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} placeholder="https://youtube.com/…" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label>Internal Notes</Label>
                <textarea value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} placeholder="Notes not visible to client…" rows={3} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_internal_note_visible_to_client} onChange={e => setForm(f => ({ ...f, is_internal_note_visible_to_client: e.target.checked }))} className="rounded" />
                <span className="text-sm text-foreground">Show internal note to client</span>
              </label>
            </form>

            <div className="p-6 border-t border-sidebar-border flex gap-3">
              <Button variant="outline" onClick={() => setPanelOpen(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2">
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingVideo ? 'Save Changes' : 'Add Video'}
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => !open && setDeleteModal({ open: false, video: null })}
        onConfirm={handleDelete}
        title="Delete Video"
        description={`Permanently delete "${deleteModal.video?.title}"?`}
      />
    </AdminLayout>
  );
}
