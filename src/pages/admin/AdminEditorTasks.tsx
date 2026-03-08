import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useToast } from '@/hooks/use-toast';
import { VIDEO_STATUSES, VIDEO_STATUS_ORDER, type VideoStatus } from '@/lib/statusConfig';
import { Search, Video, ExternalLink, FolderOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorVideo {
  id: string; title: string; status: string; client_id: string;
  assigned_editor: string | null; drive_link: string | null;
  raw_footage_link: string | null; date_planned: string | null;
  date_delivered: string | null; client_name?: string; editor_name?: string;
}

interface TeamMember { id: string; full_name: string; }

const EDITOR_RELEVANT_STATUSES: VideoStatus[] = ['footage_delivered', 'editing', 'internal_review', 'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'];

export default function AdminEditorTasks() {
  const [videos, setVideos] = useState<EditorVideo[]>([]);
  const [editors, setEditors] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editorFilter, setEditorFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('admin-editor-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, fetchVideos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchVideos(), fetchEditors()]);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, title, status, client_id, assigned_editor, drive_link, raw_footage_link, date_planned, date_delivered, clients(name)')
      .not('assigned_editor', 'is', null)
      .order('date_planned', { ascending: true, nullsFirst: false });
    if (data) {
      const editorIds = [...new Set((data as any[]).map(v => v.assigned_editor).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (editorIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', editorIds);
        profiles?.forEach(p => { profileMap[p.id] = p.full_name; });
      }
      setVideos((data as any[]).map(v => ({
        ...v,
        client_name: v.clients?.name || 'Unknown',
        editor_name: v.assigned_editor ? profileMap[v.assigned_editor] || 'Unknown' : null,
      })));
    }
  };

  const fetchEditors = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'editor');
    if (roles?.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', roles.map(r => r.user_id));
      if (profiles) setEditors(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const filtered = videos.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchEditor = !editorFilter || v.assigned_editor === editorFilter;
    return matchSearch && matchStatus && matchEditor;
  });

  const today = new Date().toISOString().split('T')[0];

  // Group by editor
  const byEditor: Record<string, EditorVideo[]> = {};
  filtered.forEach(v => {
    const key = v.editor_name || 'Unassigned';
    if (!byEditor[key]) byEditor[key] = [];
    byEditor[key].push(v);
  });

  const activeCount = videos.filter(v => !['live', 'approved', 'ready_to_upload'].includes(v.status)).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Editor Tasks</h1>
          <p className="text-muted-foreground mt-1">{videos.length} assigned videos · {activeCount} active</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 h-9 text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All statuses</option>
            {EDITOR_RELEVANT_STATUSES.map(s => <option key={s} value={s}>{VIDEO_STATUSES[s].emoji} {VIDEO_STATUSES[s].label}</option>)}
          </select>
          <select value={editorFilter} onChange={e => setEditorFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
            <option value="">All editors</option>
            {editors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
        </div>

        {/* Summary cards per editor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {editors.map(editor => {
            const editorVids = videos.filter(v => v.assigned_editor === editor.id);
            const active = editorVids.filter(v => !['live', 'approved', 'ready_to_upload'].includes(v.status)).length;
            const overdue = editorVids.filter(v => v.date_planned && v.date_planned < today && !['live', 'approved', 'ready_to_upload'].includes(v.status)).length;
            return (
              <div key={editor.id} className="glass-card p-4 space-y-1 cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                onClick={() => setEditorFilter(f => f === editor.id ? '' : editor.id)}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                    {editor.full_name.charAt(0)}
                  </div>
                  <p className="font-medium text-foreground text-sm">{editor.full_name}</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{active} active</span>
                  <span>{editorVids.length} total</span>
                  {overdue > 0 && <span className="text-destructive font-medium">{overdue} overdue</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Table + Mobile Cards */}
        <div className="glass-card overflow-auto">
          {/* Desktop table */}
          <table className="w-full text-sm hidden md:table">
            <thead className="bg-card/80 border-b border-glass-border">
              <tr>
                {['Video', 'Client', 'Stage', 'Editor', 'Due Date', 'Links'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-7 bg-muted/50 rounded animate-pulse" /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Video size={32} className="mx-auto mb-2 opacity-40" />
                  No editor tasks found.
                </td></tr>
              ) : filtered.map(video => {
                const isOverdue = video.date_planned && video.date_planned < today && !['live', 'approved', 'ready_to_upload'].includes(video.status);
                const stageIdx = VIDEO_STATUS_ORDER.indexOf(video.status as VideoStatus) + 1;
                return (
                  <tr key={video.id} className="border-b border-glass-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground max-w-52 truncate">{video.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{video.client_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={video.status as VideoStatus} type="video" />
                        <span className="text-[10px] text-muted-foreground">{stageIdx}/15</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{video.editor_name || '—'}</td>
                    <td className="px-4 py-3">
                      {video.date_planned ? (
                        <span className={cn('text-xs flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                          <Calendar size={10} />
                          {new Date(video.date_planned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {video.raw_footage_link && (
                          <a href={video.raw_footage_link} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline flex items-center gap-1">
                            <FolderOpen size={10} /> Footage
                          </a>
                        )}
                        {video.drive_link && (
                          <a href={video.drive_link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink size={10} /> Drive
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-glass-border/50">
            {loading ? [...Array(4)].map((_, i) => (
              <div key={i} className="p-4"><div className="h-16 bg-muted/50 rounded-lg animate-pulse" /></div>
            )) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Video size={32} className="mx-auto mb-2 opacity-40" />
                <p>No editor tasks found.</p>
              </div>
            ) : filtered.map(video => {
              const isOverdue = video.date_planned && video.date_planned < today && !['live', 'approved', 'ready_to_upload'].includes(video.status);
              const stageIdx = VIDEO_STATUS_ORDER.indexOf(video.status as VideoStatus) + 1;
              return (
                <div key={video.id} className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
                      {video.client_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{video.client_name}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <StatusBadge status={video.status as VideoStatus} type="video" />
                        <span className="text-[10px] text-muted-foreground">{stageIdx}/15</span>
                        {video.editor_name && <span className="text-xs text-muted-foreground">👤 {video.editor_name}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        {video.date_planned && (
                          <span className={cn('flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : '')}>
                            <Calendar size={10} />
                            {new Date(video.date_planned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            {isOverdue && ' ⚠️'}
                          </span>
                        )}
                        {video.raw_footage_link && (
                          <a href={video.raw_footage_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-amber-400">
                            <FolderOpen size={10} /> Footage
                          </a>
                        )}
                        {video.drive_link && (
                          <a href={video.drive_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary">
                            <ExternalLink size={10} /> Drive
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
