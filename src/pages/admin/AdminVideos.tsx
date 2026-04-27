import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useToast } from '@/hooks/use-toast';
import { VIDEO_STATUSES, VIDEO_STATUS_ORDER, EDITING_ONLY_STATUS_ORDER, EDITING_ONLY_ADMIN_LABELS, type VideoStatus, type ClientServiceType, getActionRequired, getStatusOrderForClient, getAdminLabel } from '@/lib/statusConfig';
import { getDirectDownloadLink } from '@/lib/driveUtils';
import { Plus, Search, X, Video, Edit2, Trash2, ExternalLink, MessageSquare, Loader2, FolderOpen, Lock } from 'lucide-react';
import { ContentPlanBadge } from '@/components/shared/ContentPlanBadge';
import { WorkflowPrompt } from '@/components/shared/WorkflowPrompt';
import { handleVideoStatusChange } from '@/lib/handleVideoStatusChange';
import { syncVideoToWritingTask } from '@/lib/syncTaskToVideo';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VideoRow {
  id: string; title: string; description: string | null; status: string;
  client_id: string; assigned_editor: string | null;
  assigned_camera_operator: string | null;
  shoot_date: string | null; shoot_start_time: string | null;
  shoot_location: string | null; shoot_notes: string | null;
  drive_link: string | null; live_url: string | null; raw_footage_link: string | null;
  internal_notes: string | null; is_internal_note_visible_to_client: boolean;
  date_planned: string | null; date_delivered: string | null; created_at: string;
  client_name?: string; editor_name?: string; camera_op_name?: string; writer_name?: string; writer_id?: string | null; designer_name?: string | null; designer_id?: string | null; feedback_count?: number;
  has_content_plan?: boolean;
}

interface Client { id: string; name: string; service_type?: string; }
interface TeamMember { id: string; full_name: string; }

const emptyForm = {
  title: '', description: '', client_id: '', assigned_editor: '',
  assigned_writer: '', assigned_designer: '',
  assigned_camera_operator: '', shoot_date: '', shoot_start_time: '',
  shoot_location: '', shoot_notes: '',
  status: 'idea', drive_link: '', live_url: '', raw_footage_link: '',
  internal_notes: '', is_internal_note_visible_to_client: false,
  date_planned: '', date_delivered: '',
};

function statusIndex(status: string): number {
  return VIDEO_STATUS_ORDER.indexOf(status as VideoStatus);
}

export default function AdminVideos() {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [editors, setEditors] = useState<TeamMember[]>([]);
  const [writers, setWriters] = useState<TeamMember[]>([]);
  const [designers, setDesigners] = useState<TeamMember[]>([]);
  const [cameraOps, setCameraOps] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [detailVideo, setDetailVideo] = useState<VideoRow | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ id: string; content: string | null; type: string; created_at: string; is_resolved?: boolean }[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; video: VideoRow | null }>({ open: false, video: null });
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const { user } = useAuth();
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
    await Promise.all([fetchVideos(), fetchClients(), fetchEditors(), fetchCameraOps(), fetchWriters(), fetchDesigners()]);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const { data } = await supabase
      .from('videos')
      .select('id, title, description, status, client_id, assigned_editor, assigned_camera_operator, shoot_date, shoot_start_time, shoot_location, shoot_notes, drive_link, live_url, raw_footage_link, internal_notes, is_internal_note_visible_to_client, date_planned, date_delivered, created_at, clients(name)')
      .order('created_at', { ascending: false });
    if (!data) return;

    const videoIds = (data as any[]).map(v => v.id);
    const directProfileIds = [...new Set((data as any[]).flatMap(v => [v.assigned_editor, v.assigned_camera_operator].filter(Boolean)))];

    // Parallel: fetch writing_tasks, design_tasks, feedback, and direct profiles all at once
    const [wTasksRes, dTasksRes, fbRes, directProfilesRes] = await Promise.all([
      videoIds.length > 0 ? supabase.from('writing_tasks').select('video_id, assigned_writer').in('video_id', videoIds).not('assigned_writer', 'is', null) : { data: [] },
      videoIds.length > 0 ? supabase.from('design_tasks').select('video_id, assigned_designer').in('video_id', videoIds).not('assigned_designer', 'is', null) : { data: [] },
      videoIds.length > 0 ? supabase.from('feedback').select('video_id').in('video_id', videoIds) : { data: [] },
      directProfileIds.length > 0 ? supabase.from('profiles').select('id, full_name').in('id', directProfileIds) : { data: [] },
    ]);

    // Collect all additional profile IDs needed from tasks
    const writerIds = [...new Set((wTasksRes.data || []).map((w: any) => w.assigned_writer).filter(Boolean))];
    const designerIds = [...new Set((dTasksRes.data || []).map((d: any) => d.assigned_designer).filter(Boolean))];
    const taskProfileIds = [...new Set([...writerIds, ...designerIds].filter(id => !directProfileIds.includes(id)))];

    // Single query for all remaining profiles
    let taskProfileMap: Record<string, string> = {};
    if (taskProfileIds.length > 0) {
      const { data: tProfiles } = await supabase.from('profiles').select('id, full_name').in('id', taskProfileIds);
      tProfiles?.forEach(p => { taskProfileMap[p.id] = p.full_name; });
    }

    // Merge all profiles into one map
    const profileMap: Record<string, string> = { ...taskProfileMap };
    (directProfilesRes.data || []).forEach((p: any) => { profileMap[p.id] = p.full_name; });

    // Build writer/designer maps
    const writerMap: Record<string, { name: string; id: string }> = {};
    (wTasksRes.data || []).forEach((w: any) => {
      if (w.video_id && w.assigned_writer) writerMap[w.video_id] = { name: profileMap[w.assigned_writer] || '', id: w.assigned_writer };
    });
    const designerMap: Record<string, { name: string; id: string }> = {};
    (dTasksRes.data || []).forEach((d: any) => {
      if (d.video_id && d.assigned_designer) designerMap[d.video_id] = { name: profileMap[d.assigned_designer] || '', id: d.assigned_designer };
    });

    // Build feedback counts
    const fbCounts: Record<string, number> = {};
    (fbRes.data || []).forEach((f: any) => { fbCounts[f.video_id] = (fbCounts[f.video_id] || 0) + 1; });

    const vids: VideoRow[] = (data as any[]).map(v => ({
      ...v,
      client_name: v.clients?.name || 'Unknown',
      editor_name: v.assigned_editor ? profileMap[v.assigned_editor] || null : null,
      camera_op_name: v.assigned_camera_operator ? profileMap[v.assigned_camera_operator] || null : null,
      writer_name: writerMap[v.id]?.name || null,
      writer_id: writerMap[v.id]?.id || null,
      designer_name: designerMap[v.id]?.name || null,
      designer_id: designerMap[v.id]?.id || null,
      feedback_count: fbCounts[v.id] || 0,
    }));
    setVideos(vids);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name, service_type').eq('is_active', true).order('name');
    if (data) setClients(data as Client[]);
  };

  const fetchEditors = async () => {
    const { data: editorRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'editor');
    if (editorRoles && editorRoles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', editorRoles.map(r => r.user_id));
      if (profiles) setEditors(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const fetchCameraOps = async () => {
    const { data: camRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'camera_operator');
    if (camRoles && camRoles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', camRoles.map(r => r.user_id));
      if (profiles) setCameraOps(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const fetchWriters = async () => {
    const { data: writerRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'writer');
    if (writerRoles && writerRoles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', writerRoles.map(r => r.user_id));
      if (profiles) setWriters(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const fetchDesigners = async () => {
    const { data: designerRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'designer');
    if (designerRoles && designerRoles.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', designerRoles.map(r => r.user_id));
      if (profiles) setDesigners(profiles.map(p => ({ id: p.id, full_name: p.full_name })));
    }
  };

  const openAdd = () => { setEditingVideo(null); setForm({ ...emptyForm }); setPanelOpen(true); setDetailVideo(null); };

  const openEdit = (video: VideoRow) => {
    setEditingVideo(video);
    setForm({
      title: video.title, description: video.description || '', client_id: video.client_id,
      assigned_editor: video.assigned_editor || '',
      assigned_writer: video.writer_id || '',
      assigned_designer: video.designer_id || '',
      assigned_camera_operator: video.assigned_camera_operator || '',
      shoot_date: video.shoot_date || '', shoot_start_time: video.shoot_start_time || '',
      shoot_location: video.shoot_location || '', shoot_notes: video.shoot_notes || '',
      status: video.status,
      drive_link: video.drive_link || '', live_url: video.live_url || '',
      raw_footage_link: video.raw_footage_link || '',
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
    
    const si = statusIndex(form.status);
    const selectedClient = clients.find(c => c.id === form.client_id);
    const isEditingOnly = selectedClient?.service_type === 'editing_only';

    // Workflow enforcement — skip for editing-only clients
    if (!isEditingOnly) {
      if (si >= statusIndex('scripting') && !form.assigned_writer) {
        toast({ title: 'Please assign a writer before moving to scripting.', variant: 'destructive' });
        return;
      }
      if (si >= statusIndex('shoot_assigned') && !form.assigned_camera_operator) {
        toast({ title: 'Please assign a camera operator and shoot date before scheduling the shoot.', variant: 'destructive' });
        return;
      }
    }
    if (si >= statusIndex('editing') && !form.assigned_editor) {
      toast({ title: 'Please assign an editor.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description || null,
        client_id: form.client_id,
        status: form.status,
        drive_link: form.drive_link ? getDirectDownloadLink(form.drive_link) : null,
        live_url: form.live_url || null,
        raw_footage_link: form.raw_footage_link || null,
        internal_notes: form.internal_notes || null,
        is_internal_note_visible_to_client: form.is_internal_note_visible_to_client,
        date_planned: form.date_planned || null,
        date_delivered: form.date_delivered || null,
      };
      // Only include gated assignments if status allows (or editing-only client)
      if (isEditingOnly || si >= statusIndex('footage_delivered')) {
        payload.assigned_editor = form.assigned_editor || null;
      }
      if (!isEditingOnly && si >= statusIndex('script_approved')) {
        payload.assigned_camera_operator = form.assigned_camera_operator || null;
        payload.shoot_date = form.shoot_date || null;
        payload.shoot_start_time = form.shoot_start_time || null;
        payload.shoot_location = form.shoot_location || null;
        payload.shoot_notes = form.shoot_notes || null;
      }

      if (editingVideo) {
        const { error } = await supabase.from('videos').update(payload as any).eq('id', editingVideo.id);
        if (error) throw error;

        // Sync status change to linked writing task
        if (editingVideo.status !== form.status) {
          await syncVideoToWritingTask(editingVideo.id, form.status);
        }

        // Handle writer assignment — create/update writing task
        if (form.assigned_writer && si >= statusIndex('idea')) {
          const { data: existingTask, error: queryErr } = await supabase.from('writing_tasks').select('id, assigned_writer').eq('video_id', editingVideo.id).maybeSingle();
          if (queryErr) console.error('Error checking writing task:', queryErr);
          if (existingTask) {
            if (existingTask.assigned_writer !== form.assigned_writer) {
              await supabase.from('writing_tasks').update({ assigned_writer: form.assigned_writer }).eq('id', existingTask.id);
            }
          } else {
            const client = clients.find(c => c.id === form.client_id);
            const { error: insertErr } = await supabase.from('writing_tasks').insert({
              video_id: editingVideo.id,
              client_id: form.client_id,
              assigned_writer: form.assigned_writer,
              title: `${form.title.trim()} — Script`,
              task_type: 'reel_script',
              status: 'briefed',
            });
            if (insertErr) {
              console.error('Error creating writing task:', insertErr);
              toast({ title: 'Warning', description: 'Video saved but writing task could not be created: ' + insertErr.message, variant: 'destructive' });
            } else {
              // Notify writer
              await supabase.from('notifications').insert({
                recipient_id: form.assigned_writer,
                message: `📝 New script assignment: '${form.title.trim()}' for ${client?.name || 'client'}. Please begin writing.`,
                type: 'assignment',
                related_video_id: editingVideo.id,
                related_client_id: form.client_id,
              });
            }
          }
        }

        // Handle designer assignment for editing-only clients (reel cover)
        if (isEditingOnly && form.assigned_designer) {
          const { data: existingDesignTask } = await supabase.from('design_tasks').select('id, assigned_designer').eq('video_id', editingVideo.id).maybeSingle();
          if (existingDesignTask) {
            if (existingDesignTask.assigned_designer !== form.assigned_designer) {
              await supabase.from('design_tasks').update({ assigned_designer: form.assigned_designer }).eq('id', existingDesignTask.id);
            }
          } else {
            await supabase.from('design_tasks').insert({
              video_id: editingVideo.id,
              client_id: form.client_id,
              assigned_designer: form.assigned_designer,
              title: `${form.title.trim()} — Reel Cover`,
              task_type: 'thumbnail',
              status: 'briefed',
            });
            await supabase.from('notifications').insert({
              recipient_id: form.assigned_designer,
              message: `🎨 New reel cover assignment: '${form.title.trim()}' for ${selectedClient?.name || 'client'}.`,
              type: 'assignment',
              related_video_id: editingVideo.id,
              related_client_id: form.client_id,
            });
          }
        }

        await supabase.from('activity_log').insert({ entity_type: 'video', entity_id: editingVideo.id, action: 'updated', details: { title: form.title } });
        toast({ title: 'Video updated' });
      } else {
        const { data, error } = await supabase.from('videos').insert(payload as any).select().single();
        if (error) throw error;

        // Create writing task if writer assigned on creation
        if (form.assigned_writer) {
          const client = clients.find(c => c.id === form.client_id);
          const { error: insertErr } = await supabase.from('writing_tasks').insert({
            video_id: data.id,
            client_id: form.client_id,
            assigned_writer: form.assigned_writer,
            title: `${form.title.trim()} — Script`,
            task_type: 'reel_script',
            status: 'briefed',
          });
          if (insertErr) {
            console.error('Error creating writing task:', insertErr);
            toast({ title: 'Warning', description: 'Video created but writing task failed: ' + insertErr.message, variant: 'destructive' });
          } else {
            await supabase.from('notifications').insert({
              recipient_id: form.assigned_writer,
              message: `📝 New script assignment: '${form.title.trim()}' for ${client?.name || 'client'}. Please begin writing.`,
              type: 'assignment',
              related_video_id: data.id,
              related_client_id: form.client_id,
            });
          }
        }

        // Handle designer assignment for editing-only on creation
        if (isEditingOnly && form.assigned_designer) {
          await supabase.from('design_tasks').insert({
            video_id: data.id,
            client_id: form.client_id,
            assigned_designer: form.assigned_designer,
            title: `${form.title.trim()} — Reel Cover`,
            task_type: 'thumbnail',
            status: 'briefed',
          });
          await supabase.from('notifications').insert({
            recipient_id: form.assigned_designer,
            message: `🎨 New reel cover assignment: '${form.title.trim()}' for ${selectedClient?.name || 'client'}.`,
            type: 'assignment',
            related_video_id: data.id,
            related_client_id: form.client_id,
          });
        }

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
    const video = videos.find(v => v.id === videoId);
    const newSi = statusIndex(newStatus);
    const videoClientSvc = clients.find(c => c.id === video?.client_id)?.service_type;
    const isVideoEditingOnly = videoClientSvc === 'editing_only';

    // Enforce workflow gates — skip writer/camera gates for editing-only
    if (!isVideoEditingOnly) {
      if (newSi >= statusIndex('scripting') && !video?.writer_name && !video?.writer_id) {
        toast({ title: 'Assign a writer first', description: 'Open the edit panel and select a writer before moving to scripting.', variant: 'destructive' });
        if (video) openEdit(video);
        return;
      }
      if (newSi >= statusIndex('shoot_assigned') && !video?.assigned_camera_operator) {
        toast({ title: 'Assign a camera operator first', description: 'Open the edit panel and assign a camera operator.', variant: 'destructive' });
        if (video) openEdit(video);
        return;
      }
    }
    if (newSi >= statusIndex('editing') && !video?.assigned_editor) {
      toast({ title: 'Assign an editor first', description: 'Open the edit panel and assign an editor.', variant: 'destructive' });
      if (video) openEdit(video);
      return;
    }

    if (!user) return;
    const result = await handleVideoStatusChange(videoId, newStatus, user.id);
    if (result.success) {
      // Sync status to linked writing task
      await syncVideoToWritingTask(videoId, newStatus);
      await fetchVideos();
      if (detailVideo?.id === videoId) setDetailVideo(v => v ? { ...v, status: newStatus } : v);
      toast({ title: `Status updated to ${VIDEO_STATUSES[newStatus as VideoStatus]?.label || newStatus}` });
    } else if (result.requiresInput) {
      // Open edit panel for required input
      if (video) openEdit(video);
      toast({ title: 'Additional info required', description: `Please fill in the required fields.`, variant: 'destructive' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
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

  // Handle WorkflowPrompt actions — open edit panel with correct context
  const handleWorkflowAction = async (action: string, data?: Record<string, unknown>) => {
    if (!user || !detailVideo) return;
    setWorkflowLoading(true);
    try {
      switch (action) {
        case 'assign_writer':
          openEdit(detailVideo);
          // Set status to scripting so writer field shows
          setTimeout(() => setForm(f => ({ ...f, status: f.status === 'idea' ? 'scripting' : f.status })), 100);
          break;
        case 'assign_camera_op':
          openEdit(detailVideo);
          setTimeout(() => setForm(f => ({ ...f, status: f.status === 'script_approved' ? 'shoot_assigned' : f.status })), 100);
          break;
        case 'assign_editor':
          openEdit(detailVideo);
          setTimeout(() => setForm(f => ({ ...f, status: f.status === 'footage_delivered' ? 'editing' : f.status })), 100);
          break;
        case 'send_script_to_client':
          await handleVideoStatusChange(detailVideo.id, 'script_client_review', user.id);
          await fetchVideos();
          break;
        case 'send_to_client':
          await handleVideoStatusChange(detailVideo.id, 'client_review', user.id);
          await fetchVideos();
          break;
        case 'mark_live':
          if (data?.live_url) {
            await handleVideoStatusChange(detailVideo.id, 'live', user.id, data);
            await fetchVideos();
          }
          break;
        case 'request_script_changes':
          // Move back to scripting
          await handleStatusChange(detailVideo.id, 'scripting');
          break;
        case 'request_editor_revisions':
          await handleStatusChange(detailVideo.id, 'editing');
          break;
        default:
          break;
      }
      // Refresh detail
      const { data: updatedData } = await supabase.from('videos').select('*, clients(name)').eq('id', detailVideo.id).single();
      if (updatedData) {
        const updated = videos.find(v => v.id === detailVideo.id);
        if (updated) setDetailVideo({ ...updated, ...updatedData, client_name: (updatedData as any).clients?.name });
      }
    } finally {
      setWorkflowLoading(false);
    }
  };

  const filtered = videos.filter(v => {
    const matchSearch = v.title.toLowerCase().includes(search.toLowerCase()) || v.client_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || v.status === statusFilter;
    const matchClient = !clientFilter || v.client_id === clientFilter;
    return matchSearch && matchStatus && matchClient;
  }).sort((a, b) => {
    const aReq = getActionRequired(a.status, a);
    const bReq = getActionRequired(b.status, b);
    const priority = { admin: 0, team: 1, client: 2, done: 3 };
    return (priority[aReq.type] ?? 9) - (priority[bReq.type] ?? 9);
  });

  const si = statusIndex(form.status);
  const selectedClient = clients.find(c => c.id === form.client_id);
  const isEditingOnly = selectedClient?.service_type === 'editing_only';
  const activeStatusOrder = isEditingOnly ? EDITING_ONLY_STATUS_ORDER : VIDEO_STATUS_ORDER;

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-8rem)] gap-4 lg:gap-6">
        {/* Main list */}
        <div className={cn('flex flex-col space-y-4', detailVideo ? 'flex-1 min-w-0 hidden lg:flex' : 'w-full')}>
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">Videos</h1>
              <p className="text-muted-foreground mt-1">{videos.length} total</p>
            </div>
            <Button onClick={openAdd} className="gap-2"><Plus size={16} /> Add Video</Button>
          </div>

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

          <div className="glass-card flex-1 overflow-auto">
            {/* Desktop table — hidden on mobile */}
            <table className="w-full text-sm hidden md:table">
              <thead className="sticky top-0 bg-card/90 backdrop-blur border-b border-glass-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action Required</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Assigned To</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Links</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Feedback</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? [...Array(6)].map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
                )) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
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
                    <td className="px-4 py-3 text-muted-foreground">{video.client_name}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const clientSvc = clients.find(c => c.id === video.client_id)?.service_type as ClientServiceType | undefined;
                        const order = getStatusOrderForClient(clientSvc || 'full_production');
                        return (
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={video.status as VideoStatus} type="video" />
                            <span className="text-[10px] text-muted-foreground">{order.indexOf(video.status as VideoStatus) + 1}/{order.length}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const ar = getActionRequired(video.status, video);
                        return <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap', ar.color)}>{ar.label}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                      {video.writer_name || video.camera_op_name || video.editor_name || '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1.5">
                        {video.raw_footage_link ? (
                          <a href={video.raw_footage_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Raw footage available">
                            <FolderOpen size={14} className="text-primary" />
                          </a>
                        ) : (
                          <FolderOpen size={14} className="text-muted-foreground/30" />
                        )}
                        {video.drive_link && (
                          <a href={video.drive_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title="Drive link">
                            <ExternalLink size={14} className="text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </td>
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

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-glass-border/50">
              {loading ? [...Array(4)].map((_, i) => (
                <div key={i} className="p-4"><div className="h-16 bg-muted/50 rounded-lg animate-pulse" /></div>
              )) : filtered.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Video size={32} className="mx-auto mb-2 opacity-40" />
                  <p>No videos found.</p>
                </div>
              ) : filtered.map(video => {
                const ar = getActionRequired(video.status, video);
                const clientSvc = clients.find(c => c.id === video.client_id)?.service_type as ClientServiceType | undefined;
                const order = getStatusOrderForClient(clientSvc || 'full_production');
                return (
                  <div
                    key={video.id}
                    onClick={() => openDetail(video)}
                    className={cn('p-4 active:bg-muted/30 transition-colors cursor-pointer',
                      detailVideo?.id === video.id && 'bg-primary/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {video.client_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{video.client_name}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <StatusBadge status={video.status as VideoStatus} type="video" />
                          <span className="text-[10px] text-muted-foreground">{order.indexOf(video.status as VideoStatus) + 1}/{order.length}</span>
                          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', ar.color)}>{ar.label}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(video)} className="p-2 hover:text-primary transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteModal({ open: true, video })} className="p-2 hover:text-destructive transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {detailVideo && (
          <div className="w-full lg:w-80 flex-shrink-0 glass-card flex flex-col overflow-hidden max-h-[80vh] lg:max-h-none">
            <div className="p-4 border-b border-glass-border flex items-start justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setDetailVideo(null)} className="lg:hidden text-muted-foreground hover:text-foreground text-sm">← Back</button>
                <div>
                  <h2 className="font-display font-semibold text-foreground text-sm">{detailVideo.title}</h2>
                  <p className="text-xs text-muted-foreground">{detailVideo.client_name}</p>
                </div>
              </div>
              <button onClick={() => setDetailVideo(null)} className="text-muted-foreground hover:text-foreground hidden lg:block"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Workflow Prompt */}
              <WorkflowPrompt
                video={detailVideo}
                loading={workflowLoading}
                onAction={handleWorkflowAction}
              />

              {/* Assignments Summary */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Assignments</p>
                {(() => {
                  const detailClientSvc = clients.find(c => c.id === detailVideo.client_id)?.service_type as ClientServiceType | undefined;
                  const isDetailEditingOnly = detailClientSvc === 'editing_only';
                  return (
                    <div className="space-y-1.5 text-xs">
                      {!isDetailEditingOnly && <div className="flex justify-between"><span className="text-muted-foreground">Writer:</span><span className="text-foreground">{detailVideo.writer_name || '—'}</span></div>}
                      {!isDetailEditingOnly && <div className="flex justify-between"><span className="text-muted-foreground">Camera Op:</span><span className="text-foreground">{detailVideo.camera_op_name || '—'}</span></div>}
                      <div className="flex justify-between"><span className="text-muted-foreground">Editor:</span><span className="text-foreground">{detailVideo.editor_name || '—'}</span></div>
                      {isDetailEditingOnly && <div className="flex justify-between"><span className="text-muted-foreground">Designer:</span><span className="text-foreground">{detailVideo.designer_name || '—'}</span></div>}
                    </div>
                  );
                })()}
              </div>

              {/* Status stepper */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipeline</p>
                {(() => {
                  const detailClientSvc = clients.find(c => c.id === detailVideo.client_id)?.service_type as ClientServiceType | undefined;
                  const detailStatusOrder = getStatusOrderForClient(detailClientSvc || 'full_production');
                  return (
                    <div className="space-y-1">
                      {detailStatusOrder.map((s, i) => {
                        const currentIdx = detailStatusOrder.indexOf(detailVideo.status as VideoStatus);
                        const isPast = i < currentIdx;
                        const isCurrent = s === detailVideo.status;
                        return (
                          <button key={s} onClick={() => handleStatusChange(detailVideo.id, s)}
                            className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all',
                              isCurrent && 'bg-primary/20 text-primary font-semibold',
                              isPast && 'text-muted-foreground',
                              !isCurrent && !isPast && 'text-foreground/50 hover:bg-muted/30',
                            )}>
                            <span className={cn('h-2 w-2 rounded-full flex-shrink-0', isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-muted-foreground/30')} />
                            {VIDEO_STATUSES[s].emoji} {detailClientSvc === 'editing_only' ? (EDITING_ONLY_ADMIN_LABELS[s] || VIDEO_STATUSES[s].label) : VIDEO_STATUSES[s].label}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Internal Links section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Internal Links</p>
                  <Lock size={10} className="text-muted-foreground" />
                </div>
                {detailVideo.raw_footage_link ? (
                  <a href={detailVideo.raw_footage_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-amber-400 hover:underline font-medium">
                    <FolderOpen size={12} /> Raw Footage
                  </a>
                ) : <p className="text-xs text-muted-foreground">No raw footage link</p>}
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

              {/* Shoot Checklist */}
              <ShootChecklist
                videoId={detailVideo.id}
                initial={(detailVideo as any).shoot_checklist || null}
              />

              {/* Comments */}
              <VideoComments videoId={detailVideo.id} />

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
                      <div key={f.id} className={cn('p-3 rounded-lg text-xs', f.is_resolved ? 'bg-muted/20 opacity-60' : 'bg-muted/40')}>
                        {f.type === 'voice' && f.content ? (
                          <audio src={f.content} controls className="w-full h-8" />
                        ) : (
                          <p className="text-foreground/80">{f.content || '[Voice note]'}</p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-muted-foreground">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</span>
                          {!f.is_resolved && (
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
              {/* Always visible fields */}
              <div className="space-y-1.5">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Video title" required />
              </div>
              <div className="space-y-1.5">
                <Label>Client *</Label>
                <select value={form.client_id} onChange={e => {
                  const cid = e.target.value;
                  const cl = clients.find(c => c.id === cid);
                  setForm(f => ({
                    ...f,
                    client_id: cid,
                    // Auto-set status to editing for editing-only clients on new video
                    ...(!editingVideo && cl?.service_type === 'editing_only' ? { status: 'editing' } : {}),
                  }));
                }} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.service_type === 'editing_only' ? '(✂️ Edit Only)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Description / Brief</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description…" rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  {activeStatusOrder.map(s => <option key={s} value={s}>{VIDEO_STATUSES[s].emoji} {isEditingOnly ? (EDITING_ONLY_ADMIN_LABELS[s] || VIDEO_STATUSES[s].label) : VIDEO_STATUSES[s].label}</option>)}
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

              {/* Writer assignment — visible at idea+ (NOT for editing-only) */}
              {!isEditingOnly && (
                <>
                  <div className="border-t border-glass-border pt-4 mt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📝 Writer Assignment</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assigned Writer</Label>
                    <select value={form.assigned_writer} onChange={e => setForm(f => ({ ...f, assigned_writer: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">Unassigned</option>
                      {writers.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </select>
                    {si >= statusIndex('scripting') && !form.assigned_writer && (
                      <p className="text-xs text-destructive">⚠️ Writer is required at scripting stage</p>
                    )}
                  </div>
                </>
              )}

              {/* Camera Op fields — only for full production clients */}
              {!isEditingOnly && (
                si >= statusIndex('script_approved') ? (
                  <>
                    <div className="border-t border-glass-border pt-4 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🎬 Shoot Assignment</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Camera Operator</Label>
                      <select value={form.assigned_camera_operator} onChange={e => setForm(f => ({ ...f, assigned_camera_operator: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                        <option value="">Unassigned</option>
                        {cameraOps.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Shoot Date</Label>
                        <Input type="date" value={form.shoot_date} onChange={e => setForm(f => ({ ...f, shoot_date: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Shoot Time</Label>
                        <Input type="time" value={form.shoot_start_time} onChange={e => setForm(f => ({ ...f, shoot_start_time: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Shoot Location</Label>
                      <Input value={form.shoot_location} onChange={e => setForm(f => ({ ...f, shoot_location: e.target.value }))} placeholder="Location address" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Shoot Notes</Label>
                      <textarea value={form.shoot_notes} onChange={e => setForm(f => ({ ...f, shoot_notes: e.target.value }))} placeholder="Notes for camera operator…" rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
                    </div>
                  </>
                ) : si >= statusIndex('scripting') ? (
                  <div className="border-t border-glass-border pt-4 mt-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Lock size={12} /> 🎬 Shoot assignment unlocks after script is approved by client
                    </p>
                  </div>
                ) : null
              )}

              {/* Editor field — always visible for editing-only, gated for full production */}
              {isEditingOnly || si >= statusIndex('footage_delivered') ? (
                <>
                  <div className="border-t border-glass-border pt-4 mt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">✂️ Editor Assignment</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assigned Editor</Label>
                    <select value={form.assigned_editor} onChange={e => setForm(f => ({ ...f, assigned_editor: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">Unassigned</option>
                      {editors.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                  </div>
                </>
              ) : !isEditingOnly && si >= statusIndex('script_approved') ? (
                <div className="border-t border-glass-border pt-4 mt-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Lock size={12} /> ✂️ Editor assignment unlocks after footage is delivered
                  </p>
                </div>
              ) : null}

              {/* Designer field — for editing-only clients (reel covers) */}
              {isEditingOnly && (
                <>
                  <div className="border-t border-glass-border pt-4 mt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🎨 Designer Assignment (Reel Cover)</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Assigned Designer</Label>
                    <select value={form.assigned_designer} onChange={e => setForm(f => ({ ...f, assigned_designer: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground">
                      <option value="">Unassigned</option>
                      {designers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                    </select>
                  </div>
                </>
              )}
              {/* Links */}
              <div className="border-t border-glass-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">🔗 Links</p>
              </div>
              <div className="space-y-1.5">
                <Label>Drive Link</Label>
                <Input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="https://drive.google.com/…" />
                <p className="text-xs text-muted-foreground">Auto-converted to direct download link</p>
              </div>
              <div className="space-y-1.5">
                <Label>Raw Footage Link</Label>
                <Input value={form.raw_footage_link} onChange={e => setForm(f => ({ ...f, raw_footage_link: e.target.value }))} placeholder="https://drive.google.com/…" />
              </div>
              <div className="space-y-1.5">
                <Label>Live URL</Label>
                <Input value={form.live_url} onChange={e => setForm(f => ({ ...f, live_url: e.target.value }))} placeholder="https://youtube.com/…" />
              </div>

              {/* Notes */}
              <div className="border-t border-glass-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📝 Notes</p>
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
