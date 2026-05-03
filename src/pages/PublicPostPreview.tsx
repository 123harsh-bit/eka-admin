import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Facebook, Youtube, Linkedin, CheckCircle2, MessageSquareWarning, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const FN = `${SUPABASE_URL}/functions/v1/social-client-approval`;

const platformIcon: Record<string, typeof Instagram> = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube, linkedin: Linkedin,
};

interface PostData {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string | null;
  media_urls: string[];
  media_type: string;
  platforms: string[];
  scheduled_at: string | null;
  client_approval_status: string | null;
  client_feedback: string | null;
  clients?: { name: string; logo_url: string | null };
}

export default function PublicPostPreview() {
  const { token } = useParams();
  const { toast } = useToast();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${FN}?token=${token}`, { headers: { apikey: ANON } })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then((d: PostData) => { setPost(d); setDone(d.client_approval_status === 'pending' ? null : d.client_approval_status); })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (decision: 'approved' | 'changes_requested') => {
    setSubmitting(true);
    try {
      const r = await fetch(`${FN}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON },
        body: JSON.stringify({ decision, feedback }),
      });
      if (!r.ok) throw new Error('Failed');
      setDone(decision);
      toast({ title: decision === 'approved' ? 'Approved — thank you!' : 'Feedback sent' });
    } catch {
      toast({ title: 'Failed to submit', variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">This preview link is invalid or expired.</div>;

  const firstMedia = post.media_urls?.[0];
  const isVideo = firstMedia?.match(/\.(mp4|mov|webm)/i);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          {post.clients?.logo_url && <img src={post.clients.logo_url} alt="" className="h-12 mx-auto mb-3" />}
          <h1 className="text-2xl font-display font-bold gradient-text">Post Preview for Approval</h1>
          <p className="text-sm text-muted-foreground mt-1">{post.clients?.name}</p>
        </div>

        <div className="glass-card overflow-hidden">
          {firstMedia && (
            <div className="aspect-square bg-card">
              {isVideo
                ? <video src={firstMedia} controls className="w-full h-full object-contain" />
                : <img src={firstMedia} alt={post.title} className="w-full h-full object-cover" />}
            </div>
          )}
          <div className="p-5 space-y-3">
            <h2 className="font-semibold text-foreground">{post.title}</h2>
            <div className="flex gap-2">
              {post.platforms.map(p => {
                const Icon = platformIcon[p];
                return Icon ? <Icon key={p} size={16} className="text-muted-foreground" /> : null;
              })}
            </div>
            {post.caption && <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption}</p>}
            {post.hashtags && <p className="text-xs text-primary">{post.hashtags}</p>}
            {post.scheduled_at && (
              <p className="text-xs text-muted-foreground">
                Scheduled: {new Date(post.scheduled_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {done ? (
          <div className="glass-card p-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto text-success" size={32} />
            <p className="font-medium">
              You {done === 'approved' ? 'approved' : 'requested changes on'} this post.
            </p>
            {post.client_feedback && <p className="text-sm text-muted-foreground">"{post.client_feedback}"</p>}
            <p className="text-xs text-muted-foreground">You can close this page.</p>
          </div>
        ) : (
          <div className="glass-card p-5 space-y-3">
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Optional feedback or change requests…" className="min-h-24" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => submit('changes_requested')} disabled={submitting} className="gap-2">
                <MessageSquareWarning size={14} /> Request changes
              </Button>
              <Button onClick={() => submit('approved')} disabled={submitting} className="gap-2 bg-success hover:bg-success/90">
                <CheckCircle2 size={14} /> Approve
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
