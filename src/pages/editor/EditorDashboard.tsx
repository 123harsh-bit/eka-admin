import { useState, useEffect } from 'react';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MyPerformance } from '@/components/shared/MyPerformance';
import { VIDEO_STATUSES, VIDEO_STATUS_ORDER, type VideoStatus } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Video, Calendar, ExternalLink, Loader2, X, ChevronRight, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface AssignedVideo {
  id: string; title: string; status: string; client_id: string;
  drive_link: string | null; raw_footage_link: string | null;
  internal_notes: string | null; date_planned: string | null;
  date_delivered: string | null; client_name?: string;
}

const EDITOR_STAGES: VideoStatus[] = ['shooting', 'editing', 'internal_review'];

export default function EditorDashboard() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<AssignedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<AssignedVideo | null>(null);
  const [driveLink, setDriveLink] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
    const channel = supabase
      .channel('editor-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `assigned_editor=eq.${user?.id}` }, fetchVideos)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchVideos = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('id, title, status, client_id, drive_link, raw_footage_link, internal_notes, date_planned, date_delivered, clients(name)')
      .eq('assigned_editor', user.id)
      .not('status', 'eq', 'live')
      .order('date_planned', { ascending: true, nullsFirst: false });
    if (data) {
      setVideos((data as unknown[]).map((v: unknown) => {
        const row = v as Record<string, unknown>;
        return { ...(row as unknown as AssignedVideo), client_name: (row.clients as { name: string } | null)?.name || 'Unknown' };
      }));
    }
    setLoading(false);
  };

  const handleStatusChange = async (videoId: string, status: string) => {
    const { error } = await supabase.from('videos').update({ status }).eq('id', videoId);
    if (!error) {
      await fetchVideos();
      if (selectedVideo?.id === videoId) setSelectedVideo(v => v ? { ...v, status } : v);
      await supabase.from('activity_log').insert({ entity_type: 'video', entity_id: videoId, action: 'status_changed', details: { status }, actor_id: user?.id });
      toast({ title: 'Status updated' });
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedVideo) return;
    setSaving(true);
    const { error } = await supabase.from('videos').update({
      drive_link: driveLink || null,
      internal_notes: notes || null,
    }).eq('id', selectedVideo.id);
    if (!error) {
      toast({ title: 'Saved' });
      await fetchVideos();
    }
    setSaving(false);
  };

  const openVideo = (v: AssignedVideo) => {
    setSelectedVideo(v);
    setDriveLink(v.drive_link || '');
    setNotes(v.internal_notes || '');
  };

  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const groups = [
    { label: 'Due Today', emoji: '🔴', items: videos.filter(v => v.date_planned === today) },
    { label: 'Due This Week', emoji: '📅', items: videos.filter(v => v.date_planned && v.date_planned > today && v.date_planned <= weekFromNow) },
    { label: 'Upcoming', emoji: '📋', items: videos.filter(v => !v.date_planned || v.date_planned > weekFromNow) },
  ];

  return (
    <EditorLayout>
      <PullToRefresh onRefresh={fetchVideos}>
        <div className="space-y-5 max-w-5xl mx-auto">
          <MyPerformance role="editor" />

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
              <p className="text-sm text-muted-foreground">{videos.length} active video{videos.length !== 1 ? 's' : ''} assigned to you</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* List */}
            <div className={cn('flex-1 min-w-0 space-y-4', selectedVideo && 'hidden lg:block')}>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : videos.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Video size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No videos assigned to you yet.</p>
                </div>
              ) : (
                groups.map(group => group.items.length > 0 && (
                  <div key={group.label} className="space-y-2">
                    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <span>{group.emoji}</span> {group.label}
                      <span className="text-[10px] text-muted-foreground/60">{group.items.length}</span>
                    </h2>
                    <div className="space-y-1.5">
                      {group.items.map(video => {
                        const isOverdue = video.date_planned && video.date_planned < today;
                        return (
                          <div key={video.id} onClick={() => openVideo(video)}
                            className={cn('glass-card p-3 cursor-pointer flex items-center gap-3 group transition-all hover:bg-card/80', selectedVideo?.id === video.id && 'ring-1 ring-primary')}>
                            <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center text-xs font-bold text-blue-400 flex-shrink-0">
                              {video.client_name?.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                              <p className="text-[11px] text-muted-foreground">{video.client_name}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <StatusBadge status={video.status as VideoStatus} type="video" />
                              {video.date_planned && (
                                <span className={cn('text-[10px] flex items-center gap-1', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                  <Calendar size={9} />
                                  {new Date(video.date_planned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              <ChevronRight size={12} className="text-muted-foreground/40" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Detail Panel */}
            {selectedVideo && (
              <div className="w-full lg:w-80 flex-shrink-0 glass-card flex flex-col overflow-hidden max-h-[80vh] lg:max-h-[calc(100vh-8rem)]">
                <div className="p-4 border-b border-border flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedVideo(null)} className="lg:hidden text-muted-foreground hover:text-foreground text-sm">← Back</button>
                    <div>
                      <h2 className="font-semibold text-foreground text-sm">{selectedVideo.title}</h2>
                      <p className="text-xs text-muted-foreground">{selectedVideo.client_name}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedVideo(null)} className="text-muted-foreground hover:text-foreground hidden lg:block"><X size={16} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Raw Footage */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Internal Links</p>
                    {selectedVideo.raw_footage_link ? (
                      <a href={selectedVideo.raw_footage_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-amber-400 hover:underline font-medium py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <FolderOpen size={12} /> Open Raw Footage
                      </a>
                    ) : (
                      <p className="text-[11px] text-muted-foreground/60">No raw footage link</p>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workflow Stage</p>
                    <div className="space-y-0.5">
                      {VIDEO_STATUS_ORDER.map((s, i) => {
                        const currentIdx = VIDEO_STATUS_ORDER.indexOf(selectedVideo.status as VideoStatus);
                        const isPast = i < currentIdx;
                        const isCurrent = s === selectedVideo.status;
                        const isEditable = EDITOR_STAGES.includes(s);
                        return (
                          <button key={s} onClick={() => isEditable && handleStatusChange(selectedVideo.id, s)}
                            disabled={!isEditable}
                            className={cn('w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all',
                              isCurrent && 'bg-primary/15 text-primary font-semibold',
                              isPast && 'text-muted-foreground/60',
                              !isCurrent && !isPast && 'text-foreground/40',
                              isEditable && !isCurrent && 'hover:bg-muted/30 cursor-pointer',
                              !isEditable && 'cursor-default opacity-50',
                            )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', isCurrent ? 'bg-primary' : isPast ? 'bg-success' : 'bg-muted-foreground/20')} />
                            {VIDEO_STATUSES[s].emoji} {VIDEO_STATUSES[s].label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Google Drive Link</Label>
                    <Input value={driveLink} onChange={e => setDriveLink(e.target.value)} placeholder="https://drive.google.com/…" className="text-xs h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px]">Internal Notes</Label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Notes…"
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground resize-none" />
                  </div>

                  <Button size="sm" onClick={handleSaveDetails} disabled={saving} className="w-full gap-2">
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    Save Changes
                  </Button>

                  {selectedVideo.drive_link && (
                    <a href={selectedVideo.drive_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <ExternalLink size={10} /> Open Drive File
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </EditorLayout>
  );
}