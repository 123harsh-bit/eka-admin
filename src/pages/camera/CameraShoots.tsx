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
import { Camera, MapPin, Clock, FileText, ExternalLink, Loader2, AlertTriangle, CheckCircle, ChevronRight, X, Calendar, FolderOpen } from 'lucide-react';
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
      const mapped = (data as any[]).map(v => ({
        ...v,
        client_name: v.clients?.name || 'Unknown',
      }));

      // Fetch linked script doc links
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
      setFootageLink('');
      setFootageNotes('');
      setSelectedVideo(null);
      await fetchShoots();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const openVideo = (v: ShootVideo) => {
    setSelectedVideo(v);
    setFootageLink('');
    setFootageNotes('');
  };

  const today = new Date().toISOString().split('T')[0];

  const todayShoots = videos.filter(v => v.status === 'shooting' || (v.status === 'shoot_assigned' && v.shoot_date === today));
  const upcoming = videos.filter(v => v.status === 'shoot_assigned' && v.shoot_date && v.shoot_date > today);
  const overdue = videos.filter(v => ['shoot_assigned', 'shooting'].includes(v.status) && v.shoot_date && v.shoot_date < today && v.shoot_date !== today);
  const completed = videos.filter(v => ['footage_delivered', 'editing', 'internal_review', 'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'].includes(v.status));

  const groups = [
    { label: "Today's Shoot", items: todayShoots, icon: '🔴', color: 'text-destructive' },
    { label: 'Overdue', items: overdue, icon: '⚠️', color: 'text-warning' },
    { label: 'Upcoming Shoots', items: upcoming, icon: '📅', color: 'text-muted-foreground' },
    { label: `Completed (${completed.length})`, items: completed, icon: '✅', color: 'text-muted-foreground', collapsed: true },
  ];

  return (
    <CameraLayout>
      <PullToRefresh onRefresh={fetchShoots}>
      <div className="space-y-6">
        <MyPerformance role="camera_operator" />
        <div className="flex gap-6 h-[calc(100vh-10rem)]">
          <div className={cn('flex flex-col space-y-4', selectedVideo ? 'flex-1 min-w-0' : 'w-full')}>
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">My Shoots</h1>
              <p className="text-muted-foreground mt-1">{videos.length} total shoot{videos.length !== 1 ? 's' : ''} assigned to you</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}
                </div>
              ) : videos.length === 0 ? (
                <div className="glass-card p-16 text-center">
                  <Camera size={40} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">No shoots assigned yet</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Your assigned shoots will appear here once the admin schedules them.</p>
                </div>
              ) : (
                groups.map(group => {
                  if (group.items.length === 0) return null;
                  const content = (
                    <div className="space-y-2">
                      {group.items.map(video => {
                        const isOverdue = video.shoot_date && video.shoot_date < today && video.status !== 'shooting';
                        const isActive = video.status === 'shooting';
                        return (
                          <div key={video.id} onClick={() => openVideo(video)}
                            className={cn(
                              'glass-card-hover p-4 cursor-pointer space-y-2',
                              selectedVideo?.id === video.id && 'ring-1 ring-primary',
                              isActive && 'border-l-4 border-l-destructive',
                              isOverdue && 'border-l-4 border-l-warning',
                            )}>
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400 flex-shrink-0">
                                {video.client_name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{video.title}</p>
                                <p className="text-xs text-muted-foreground">{video.client_name}</p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <StatusBadge status={video.status as VideoStatus} type="video" />
                                <ChevronRight size={14} className="text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                              {video.shoot_date && (
                                <span className={cn('flex items-center gap-1', isOverdue ? 'text-destructive font-medium' : '')}>
                                  <Calendar size={10} />
                                  {new Date(video.shoot_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                              {video.shoot_start_time && (
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {video.shoot_start_time}
                                </span>
                              )}
                              {video.shoot_location && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={10} /> {video.shoot_location}
                                </span>
                              )}
                            </div>
                            {isActive && (
                              <div className="flex items-center gap-2 text-destructive text-xs font-bold">
                                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                                FILMING IN PROGRESS
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );

                  return group.collapsed ? (
                    <details key={group.label} className="mt-2">
                      <summary className={cn('text-sm font-semibold uppercase tracking-wider cursor-pointer hover:text-foreground mb-2', group.color)}>
                        {group.icon} {group.label}
                      </summary>
                      {content}
                    </details>
                  ) : (
                    <div key={group.label}>
                      <h2 className={cn('text-sm font-semibold uppercase tracking-wider mb-2 flex items-center gap-2', group.color)}>
                        {group.icon} {group.label}
                      </h2>
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel — same style as editor */}
          {selectedVideo && (
            <div className="w-80 flex-shrink-0 glass-card flex flex-col overflow-hidden">
              <div className="p-4 border-b border-glass-border flex items-start justify-between">
                <div>
                  <h2 className="font-display font-semibold text-foreground text-sm">{selectedVideo.title}</h2>
                  <p className="text-xs text-muted-foreground">{selectedVideo.client_name}</p>
                </div>
                <button onClick={() => setSelectedVideo(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Shoot Details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shoot Details</p>
                  <div className="space-y-2">
                    {selectedVideo.shoot_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-muted-foreground" />
                        <span className="text-foreground font-medium">
                          {new Date(selectedVideo.shoot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {selectedVideo.shoot_start_time && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-muted-foreground" />
                        <span className="text-foreground">{selectedVideo.shoot_start_time}</span>
                      </div>
                    )}
                    {selectedVideo.shoot_location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin size={14} className="text-muted-foreground" />
                        <span className="text-foreground">{selectedVideo.shoot_location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shoot Notes */}
                {selectedVideo.shoot_notes && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shoot Notes</p>
                    <p className="text-xs text-foreground/80 bg-muted/30 rounded-lg p-3">{selectedVideo.shoot_notes}</p>
                  </div>
                )}

                {/* Script Link */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Script</p>
                  {selectedVideo.script_doc_link ? (
                    <a href={selectedVideo.script_doc_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline font-medium py-2 px-3 rounded-lg bg-primary/10 border border-primary/20">
                      <FileText size={14} /> View Script
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">No script linked</p>
                  )}
                </div>

                {/* Raw Footage */}
                {selectedVideo.raw_footage_link && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Uploaded Footage</p>
                    <a href={selectedVideo.raw_footage_link} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-amber-400 hover:underline font-medium py-2 px-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <FolderOpen size={14} /> Open Raw Footage
                    </a>
                  </div>
                )}

                {/* Actions */}
                {selectedVideo.status === 'shoot_assigned' && (
                  <Button onClick={() => handleMarkFilming(selectedVideo.id)}
                    disabled={actionLoading === selectedVideo.id}
                    className="w-full gap-2">
                    {actionLoading === selectedVideo.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    🎥 Start Filming
                  </Button>
                )}

                {selectedVideo.status === 'shooting' && (
                  <div className="space-y-3 bg-muted/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground">Upload Raw Footage</p>
                    <Input value={footageLink} onChange={e => setFootageLink(e.target.value)}
                      placeholder="https://drive.google.com/…" className="text-sm" />
                    <textarea value={footageNotes} onChange={e => setFootageNotes(e.target.value)}
                      placeholder="Notes for editor (best takes, angles)…" rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
                    <Button onClick={() => handleUploadFootage(selectedVideo.id)}
                      disabled={!footageLink.trim() || actionLoading === selectedVideo.id}
                      className="w-full gap-2">
                      {actionLoading === selectedVideo.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      📁 Mark Footage Delivered
                    </Button>
                  </div>
                )}

                {/* Status */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Current Stage</p>
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
