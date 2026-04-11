import { useState, useEffect } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MyPerformance } from '@/components/shared/MyPerformance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { handleVideoStatusChange } from '@/lib/handleVideoStatusChange';
import { Camera, MapPin, Clock, FileText, Loader2, CheckCircle, ChevronRight, X, Calendar, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/lib/statusConfig';
import { PullToRefresh } from '@/components/shared/PullToRefresh';

interface ShootVideo {
  id: string; title: string; status: string; client_id: string;
  shoot_date: string | null; shoot_start_time: string | null;
  shoot_location: string | null; shoot_notes: string | null;
  raw_footage_link: string | null; footage_uploaded_at: string | null;
  date_planned: string | null; client_name?: string;
  script_doc_link?: string | null;
}

export default function CameraShoots() {
  const { user } = useAuth();
  const [videos, setVideos] = useState<ShootVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<ShootVideo | null>(null);
  const [footageLink, setFootageLink] = useState('');
  const [footageNotes, setFootageNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    fetchShoots();
    const channel = supabase
      .channel('camera-shoots')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `assigned_camera_operator=eq.${user.id}` }, fetchShoots)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchShoots = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('id, title, status, client_id, shoot_date, shoot_start_time, shoot_location, shoot_notes, raw_footage_link, footage_uploaded_at, date_planned, clients(name)')
      .eq('assigned_camera_operator', user.id)
      .order('shoot_date', { ascending: true, nullsFirst: false });
    if (data) {
      const mapped = (data as any[]).map(v => ({ ...v, client_name: v.clients?.name || 'Unknown' }));
      const videoIds = mapped.map(v => v.id);
      if (videoIds.length > 0) {
        const { data: wTasks } = await supabase.from('writing_tasks').select('video_id, doc_link').in('video_id', videoIds);
        if (wTasks) {
          const docMap: Record<string, string | null> = {};
          wTasks.forEach(w => { if (w.video_id) docMap[w.video_id] = w.doc_link; });
          mapped.forEach(v => { v.script_doc_link = docMap[v.id] || null; });
        }
      }
      setVideos(mapped);
    }
    setLoading(false);
  };

  const handleMarkFilming = async (videoId: string) => {
    if (!user) return;
    setActionLoading(videoId);
    const result = await handleVideoStatusChange(videoId, 'shooting', user.id);
    if (result.success) {
      toast({ title: '🎥 Marked as filming!' });
      await fetchShoots();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleUploadFootage = async (videoId: string) => {
    if (!user || !footageLink.trim()) return;
    setActionLoading(videoId);
    await supabase.from('videos').update({
      raw_footage_link: footageLink.trim(),
      footage_uploaded_at: new Date().toISOString(),
    } as any).eq('id', videoId);
    if (footageNotes.trim()) {
      await supabase.from('videos').update({ shoot_notes: footageNotes.trim() } as any).eq('id', videoId);
    }
    const result = await handleVideoStatusChange(videoId, 'footage_delivered', user.id);
    if (result.success) {
      toast({ title: '📁 Footage delivered!' });
      setFootageLink(''); setFootageNotes(''); setSelectedVideo(null);
      await fetchShoots();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const openVideo = (v: ShootVideo) => {
    setSelectedVideo(v);
    setFootageLink(''); setFootageNotes('');
  };

  const today = new Date().toISOString().split('T')[0];
  const todayShoots = videos.filter(v => v.status === 'shooting' || (v.status === 'shoot_assigned' && v.shoot_date === today));
  const upcoming = videos.filter(v => v.status === 'shoot_assigned' && v.shoot_date && v.shoot_date > today);
  const overdue = videos.filter(v => ['shoot_assigned', 'shooting'].includes(v.status) && v.shoot_date && v.shoot_date < today && v.shoot_date !== today);
  const completed = videos.filter(v => ['footage_delivered', 'editing', 'internal_review', 'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'].includes(v.status));

  const groups = [
    { label: "Today's Shoot", items: todayShoots, emoji: '🔴' },
    { label: 'Overdue', items: overdue, emoji: '⚠️' },
    { label: 'Upcoming', items: upcoming, emoji: '📅' },
    { label: `Completed (${completed.length})`, items: completed, emoji: '✅', collapsed: true },
  ];

  return (
    <CameraLayout>
      <PullToRefresh onRefresh={fetchShoots}>
        <div className="space-y-5 max-w-5xl mx-auto">
          <MyPerformance role="camera_operator" />

          <div>
            <h1 className="text-2xl font-bold text-foreground">My Shoots</h1>
            <p className="text-sm text-muted-foreground">{videos.length} total shoot{videos.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className={cn('flex-1 min-w-0 space-y-4', selectedVideo && 'hidden lg:block')}>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
              ) : videos.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Camera size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No shoots assigned yet</p>
                </div>
              ) : (
                groups.map(group => {
                  if (group.items.length === 0) return null;
                  const content = (
                    <div className="space-y-1.5">
                      {group.items.map(video => {
                        const isActive = video.status === 'shooting';
                        const isOverdue = video.shoot_date && video.shoot_date < today && video.status !== 'shooting';
                        return (
                          <div key={video.id} onClick={() => openVideo(video)}
                            className={cn(
                              'glass-card p-3 cursor-pointer space-y-1.5 transition-all hover:bg-card/80',
                              selectedVideo?.id === video.id && 'ring-1 ring-primary',
                              isActive && 'border-l-2 border-l-destructive',
                              isOverdue && 'border-l-2 border-l-warning',
                            )}>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center text-xs font-bold text-violet-400 flex-shrink-0">
                                {video.client_name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{video.title}</p>
                                <p className="text-[11px] text-muted-foreground">{video.client_name}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <StatusBadge status={video.status as VideoStatus} type="video" />
                                <ChevronRight size={12} className="text-muted-foreground/40" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                              {video.shoot_date && (
                                <span className={cn('flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : '')}>
                                  <Calendar size={9} />
                                  {new Date(video.shoot_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                              )}
                              {video.shoot_start_time && <span className="flex items-center gap-1"><Clock size={9} /> {video.shoot_start_time}</span>}
                              {video.shoot_location && <span className="flex items-center gap-1"><MapPin size={9} /> {video.shoot_location}</span>}
                            </div>
                            {isActive && (
                              <div className="flex items-center gap-2 text-destructive text-[10px] font-bold">
                                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" /> FILMING
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                  return group.collapsed ? (
                    <details key={group.label}>
                      <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground mb-2 flex items-center gap-2">
                        <span>{group.emoji}</span> {group.label}
                      </summary>
                      {content}
                    </details>
                  ) : (
                    <div key={group.label} className="space-y-2">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <span>{group.emoji}</span> {group.label} <span className="text-[10px] text-muted-foreground/60">{group.items.length}</span>
                      </h2>
                      {content}
                    </div>
                  );
                })
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
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shoot Details</p>
                    <div className="space-y-1.5">
                      {selectedVideo.shoot_date && (
                        <div className="flex items-center gap-2 text-xs">
                          <Calendar size={12} className="text-muted-foreground" />
                          <span className="text-foreground">{new Date(selectedVideo.shoot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                      )}
                      {selectedVideo.shoot_start_time && <div className="flex items-center gap-2 text-xs"><Clock size={12} className="text-muted-foreground" /><span className="text-foreground">{selectedVideo.shoot_start_time}</span></div>}
                      {selectedVideo.shoot_location && <div className="flex items-center gap-2 text-xs"><MapPin size={12} className="text-muted-foreground" /><span className="text-foreground">{selectedVideo.shoot_location}</span></div>}
                    </div>
                  </div>

                  {selectedVideo.shoot_notes && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                      <p className="text-xs text-foreground/80 bg-muted/30 rounded-lg p-2.5">{selectedVideo.shoot_notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Script</p>
                    {selectedVideo.script_doc_link ? (
                      <a href={selectedVideo.script_doc_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline font-medium py-2 px-3 rounded-lg bg-primary/10 border border-primary/20">
                        <FileText size={12} /> View Script
                      </a>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No script linked</p>
                    )}
                  </div>

                  {selectedVideo.raw_footage_link && (
                    <a href={selectedVideo.raw_footage_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-amber-400 hover:underline font-medium py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <FolderOpen size={12} /> Open Raw Footage
                    </a>
                  )}

                  {selectedVideo.status === 'shoot_assigned' && (
                    <Button onClick={() => handleMarkFilming(selectedVideo.id)} disabled={actionLoading === selectedVideo.id} className="w-full gap-2">
                      {actionLoading === selectedVideo.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                      🎥 Start Filming
                    </Button>
                  )}

                  {selectedVideo.status === 'shooting' && (
                    <div className="space-y-2 bg-muted/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-foreground">Upload Raw Footage</p>
                      <Input value={footageLink} onChange={e => setFootageLink(e.target.value)} placeholder="https://drive.google.com/…" className="text-xs h-8" />
                      <textarea value={footageNotes} onChange={e => setFootageNotes(e.target.value)} placeholder="Notes for editor…" rows={2}
                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground resize-none" />
                      <Button onClick={() => handleUploadFootage(selectedVideo.id)} disabled={!footageLink.trim() || actionLoading === selectedVideo.id} className="w-full gap-2">
                        {actionLoading === selectedVideo.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        📁 Mark Delivered
                      </Button>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                    <StatusBadge status={selectedVideo.status as VideoStatus} type="video" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </CameraLayout>
  );
}