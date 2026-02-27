import { useState, useEffect } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { handleVideoStatusChange } from '@/lib/handleVideoStatusChange';
import { Camera, MapPin, Clock, FileText, ExternalLink, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VideoStatus } from '@/lib/statusConfig';

interface ShootVideo {
  id: string; title: string; status: string; client_id: string;
  shoot_date: string | null; shoot_start_time: string | null;
  shoot_location: string | null; shoot_notes: string | null;
  raw_footage_link: string | null; footage_uploaded_at: string | null;
  date_planned: string | null; client_name?: string;
  writing_doc_link?: string | null;
}

export default function CameraShoots() {
  const { user } = useAuth();
  useAttendance();
  const [videos, setVideos] = useState<ShootVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [footageLink, setFootageLink] = useState('');
  const [footageNotes, setFootageNotes] = useState('');
  const [expandedUpload, setExpandedUpload] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) {
      setVideos([]);
      setLoading(false);
      return;
    }

    fetchShoots();
    const channel = supabase
      .channel(`camera-shoots-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `assigned_camera_operator=eq.${user.id}` }, fetchShoots)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchShoots = async () => {
    if (!user?.id) return;
    setLoading(true);

    const { data } = await supabase
      .from('videos')
      .select('id, title, status, client_id, shoot_date, shoot_start_time, shoot_location, shoot_notes, raw_footage_link, footage_uploaded_at, date_planned, clients(name)')
      .eq('assigned_camera_operator', user.id)
      .order('shoot_date', { ascending: true, nullsFirst: false });

    if (data) {
      const videoIds = (data as any[]).map(v => v.id);
      const { data: scriptTasks } = videoIds.length
        ? await supabase.from('writing_tasks').select('video_id, doc_link').in('video_id', videoIds).not('doc_link', 'is', null)
        : { data: [] as Array<{ video_id: string; doc_link: string | null }> };

      const scriptMap: Record<string, string | null> = {};
      (scriptTasks || []).forEach(task => { if (task.video_id) scriptMap[task.video_id] = task.doc_link; });

      const mapped = (data as any[]).map(v => ({
        ...v,
        client_name: v.clients?.name || 'Unknown',
        writing_doc_link: scriptMap[v.id] || null,
      }));
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
    setUploadingId(videoId);
    
    // Save raw footage link
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
      setExpandedUpload(null);
      await fetchShoots();
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setUploadingId(null);
  };

  const today = new Date().toISOString().split('T')[0];
  
  const upcoming = videos.filter(v => v.status === 'shoot_assigned' && v.shoot_date && v.shoot_date > today);
  const active = videos.filter(v => v.status === 'shooting' && v.shoot_date === today);
  const overdue = videos.filter(v => ['shoot_assigned', 'shooting'].includes(v.status) && v.shoot_date && v.shoot_date < today && !v.footage_uploaded_at);
  const completed = videos.filter(v => ['footage_delivered', 'editing', 'internal_review', 'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'].includes(v.status));

  const ShootCard = ({ video, section }: { video: ShootVideo; section: 'upcoming' | 'active' | 'overdue' | 'completed' }) => {
    const isActive = section === 'active';
    const isOverdue = section === 'overdue';
    return (
      <div className={cn(
        'glass-card p-5 space-y-4',
        isActive && 'ring-2 ring-destructive/60 animate-pulse-subtle',
        isOverdue && 'border-l-4 border-l-warning',
      )}>
        {isActive && (
          <div className="flex items-center gap-2 text-destructive text-xs font-bold">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            🔴 FILMING IN PROGRESS
          </div>
        )}
        {isOverdue && (
          <div className="flex items-center gap-2 text-warning text-xs font-bold">
            <AlertTriangle size={12} /> OVERDUE
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-lg">{video.title}</h3>
            <p className="text-sm text-muted-foreground">{video.client_name}</p>
          </div>
          <StatusBadge status={video.status as VideoStatus} type="video" />
        </div>

        {video.shoot_date && (
          <div className="space-y-1">
            <p className={cn('text-xl font-bold', isOverdue ? 'text-destructive' : 'text-foreground')}>
              {new Date(video.shoot_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {video.shoot_start_time && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock size={14} /> Starting at {video.shoot_start_time}
              </p>
            )}
          </div>
        )}
        {video.shoot_location && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin size={14} /> {video.shoot_location}
          </p>
        )}

        {video.shoot_notes && (
          <details className="text-sm">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1">
              <FileText size={12} /> Shoot Notes
            </summary>
            <p className="mt-2 text-foreground/80 bg-muted/30 rounded-lg p-3 text-xs">{video.shoot_notes}</p>
          </details>
        )}

        {/* Action buttons */}
        {section === 'upcoming' && (
          <Button onClick={() => handleMarkFilming(video.id)} disabled={actionLoading === video.id}
            className="w-full gap-2 bg-success hover:bg-success/90">
            {actionLoading === video.id ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            🎥 Mark as Filming
          </Button>
        )}

        {section === 'active' && (
          <>
            {expandedUpload === video.id ? (
              <div className="space-y-3 bg-muted/20 rounded-lg p-4">
                <p className="text-sm font-medium text-foreground">Paste Google Drive link to raw footage folder</p>
                <Input value={footageLink} onChange={e => setFootageLink(e.target.value)} placeholder="https://drive.google.com/…" />
                <textarea value={footageNotes} onChange={e => setFootageNotes(e.target.value)}
                  placeholder="Notes for editor (e.g. best takes, angles used)…" rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground resize-none" />
                <div className="flex gap-2">
                  <Button onClick={() => handleUploadFootage(video.id)} disabled={!footageLink.trim() || uploadingId === video.id}
                    className="flex-1 gap-2">
                    {uploadingId === video.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Mark Footage as Delivered ✓
                  </Button>
                  <Button variant="outline" onClick={() => setExpandedUpload(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setExpandedUpload(video.id)} className="w-full gap-2 bg-primary hover:bg-primary/90">
                📁 Upload Raw Footage
              </Button>
            )}
          </>
        )}

        {section === 'completed' && video.raw_footage_link && (
          <a href={video.raw_footage_link} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ExternalLink size={14} /> Open Footage
          </a>
        )}
      </div>
    );
  };

  return (
    <CameraLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">My Shoots</h1>
          <p className="text-muted-foreground mt-1">{videos.length} total shoot{videos.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse" />)}</div>
        ) : videos.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Camera size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No shoots assigned to you yet.</p>
          </div>
        ) : (
          <>
            {overdue.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-warning uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle size={14} /> Overdue Shoots
                </h2>
                <div className="space-y-4">{overdue.map(v => <ShootCard key={v.id} video={v} section="overdue" />)}</div>
              </section>
            )}
            {active.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3">Active / Today's Shoots</h2>
                <div className="space-y-4">{active.map(v => <ShootCard key={v.id} video={v} section="active" />)}</div>
              </section>
            )}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Upcoming Shoots</h2>
                <div className="space-y-4">{upcoming.map(v => <ShootCard key={v.id} video={v} section="upcoming" />)}</div>
              </section>
            )}
            {completed.length > 0 && (
              <details className="mt-6">
                <summary className="text-sm font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground">
                  Completed Shoots ({completed.length})
                </summary>
                <div className="space-y-4 mt-3">{completed.map(v => <ShootCard key={v.id} video={v} section="completed" />)}</div>
              </details>
            )}
          </>
        )}
      </div>
    </CameraLayout>
  );
}
