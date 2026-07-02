import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Download, ExternalLink, CheckCircle2, Clock, Send, PlayCircle } from 'lucide-react';
import { getDirectDownloadLink } from '@/lib/driveUtils';

interface VideoQueueRow {
  id: string;
  title: string;
  status: string;
  drive_link: string | null;
  live_url: string | null;
  social_stage: string | null;
  social_scheduled_at: string | null;
  social_posted_at: string | null;
  priority: number | null;
  clients: { name: string } | null;
}

const STAGES = ['queued', 'downloaded', 'scheduled', 'posted'] as const;
type Stage = typeof STAGES[number];

const stageMeta: Record<Stage, { label: string; color: string; icon: typeof Clock }> = {
  queued: { label: 'Queued', color: 'bg-muted-foreground/20 text-muted-foreground', icon: Clock },
  downloaded: { label: 'Downloaded', color: 'bg-blue-500/20 text-blue-400', icon: Download },
  scheduled: { label: 'Scheduled', color: 'bg-amber-500/20 text-amber-400', icon: Send },
  posted: { label: 'Posted (Live)', color: 'bg-success/20 text-success', icon: CheckCircle2 },
};

export function PublishingQueue() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [videos, setVideos] = useState<VideoQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'active' | 'posted' | 'all'>('active');

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('videos')
      .select('id, title, status, drive_link, live_url, social_stage, social_scheduled_at, social_posted_at, priority, clients(name)')
      .eq('assigned_social_id', user.id)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });
    setVideos((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const updateStage = async (v: VideoQueueRow, stage: Stage) => {
    const payload: any = { social_stage: stage };
    if (stage === 'posted') {
      const liveUrl = urls[v.id] ?? v.live_url ?? '';
      if (!liveUrl.trim()) {
        toast({ title: 'Live URL required', description: 'Paste the published post URL before marking as Posted.', variant: 'destructive' });
        return;
      }
      payload.live_url = liveUrl.trim();
      payload.social_posted_at = new Date().toISOString();
    }
    const { error } = await supabase.from('videos').update(payload).eq('id', v.id);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: `Marked as ${stageMeta[stage].label}` });
    refresh();
  };

  const visible = videos.filter(v => {
    if (filter === 'all') return true;
    if (filter === 'posted') return v.social_stage === 'posted' || v.status === 'live';
    return v.social_stage !== 'posted' && v.status !== 'live';
  });

  const counts = {
    queued: videos.filter(v => (v.social_stage || 'queued') === 'queued' && v.status !== 'live').length,
    downloaded: videos.filter(v => v.social_stage === 'downloaded').length,
    scheduled: videos.filter(v => v.social_stage === 'scheduled').length,
    posted: videos.filter(v => v.social_stage === 'posted' || v.status === 'live').length,
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-semibold text-foreground flex items-center gap-2"><PlayCircle size={18} className="text-amber-400" /> Publishing Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Videos approved by clients — download, upload to socials, then mark as Posted.</p>
        </div>
        <div className="flex gap-1.5">
          {(['active', 'posted', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {(STAGES as readonly Stage[]).map(s => (
          <div key={s} className={`px-3 py-2 rounded-md ${stageMeta[s].color}`}>
            <div className="font-medium">{stageMeta[s].label}</div>
            <div className="text-lg font-bold">{counts[s]}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted/30 rounded animate-pulse" />)}</div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No videos in this view yet. New approved videos will appear here automatically.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(v => {
            const stage = (v.social_stage || 'queued') as Stage;
            const Icon = stageMeta[stage].icon;
            const dl = v.drive_link ? getDirectDownloadLink(v.drive_link) : null;
            return (
              <div key={v.id} className="rounded-lg bg-card/50 hover:bg-card transition-colors p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.clients?.name || 'Unknown client'}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-semibold uppercase flex items-center gap-1 ${stageMeta[stage].color}`}>
                    <Icon size={10} /> {stageMeta[stage].label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  {dl && (
                    <Button size="sm" variant="secondary" asChild className="h-8 gap-1.5 text-xs">
                      <a href={dl} target="_blank" rel="noopener noreferrer"><Download size={12} /> Download</a>
                    </Button>
                  )}
                  {v.live_url && (
                    <Button size="sm" variant="ghost" asChild className="h-8 gap-1.5 text-xs">
                      <a href={v.live_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> View Live</a>
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {stage === 'queued' && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStage(v, 'downloaded')}>Mark Downloaded</Button>
                  )}
                  {(stage === 'queued' || stage === 'downloaded') && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => updateStage(v, 'scheduled')}>Mark Scheduled</Button>
                  )}
                  {stage !== 'posted' && (
                    <div className="flex gap-1.5 items-center w-full sm:w-auto">
                      <Input
                        placeholder="Paste live post URL"
                        value={urls[v.id] ?? v.live_url ?? ''}
                        onChange={e => setUrls(u => ({ ...u, [v.id]: e.target.value }))}
                        className="h-8 text-xs w-full sm:w-64"
                      />
                      <Button size="sm" className="h-8 text-xs gap-1" onClick={() => updateStage(v, 'posted')}>
                        <CheckCircle2 size={12} /> Posted
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
