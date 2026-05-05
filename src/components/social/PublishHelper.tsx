import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  Instagram, Facebook, Youtube, Linkedin,
  Copy, Download, ExternalLink, CheckCircle2, Loader2, BarChart3,
  Send, Sparkles, Link2, ShieldCheck, ShieldAlert, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string | null;
  media_urls: string[];
  platforms: string[];
  status: string;
  platform_urls: Record<string, string>;
  analytics: Record<string, { comments?: number; views?: number; reach?: number }>;
  approval_status: string;
  rejection_reason: string | null;
  client_approval_token: string | null;
  client_approval_status: string | null;
  client_feedback: string | null;
  created_by: string;
}

const PLATFORM_META: Record<string, {
  label: string; icon: typeof Instagram; color: string;
  composer: string; captionLimit: number; hashtagStyle: 'inline' | 'firstComment' | 'append';
}> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-400 border-pink-500/40 bg-pink-500/10', composer: 'https://www.instagram.com/', captionLimit: 2200, hashtagStyle: 'firstComment' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10', composer: 'https://www.facebook.com/', captionLimit: 63206, hashtagStyle: 'append' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-400 border-red-500/40 bg-red-500/10', composer: 'https://studio.youtube.com/channel/UC/videos/upload', captionLimit: 5000, hashtagStyle: 'append' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400 border-sky-500/40 bg-sky-500/10', composer: 'https://www.linkedin.com/feed/?shareActive=true', captionLimit: 3000, hashtagStyle: 'append' },
};

interface Props {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function PublishHelper({ postId, open, onOpenChange, onPublished }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [analytics, setAnalytics] = useState<Record<string, { comments?: number; views?: number; reach?: number }>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const load = () => {
    if (!postId) return;
    setLoading(true);
    supabase.from('scheduled_posts').select('*').eq('id', postId).single().then(({ data }) => {
      if (data) {
        const p = data as unknown as Post;
        setPost(p);
        setUrls(p.platform_urls || {});
        setAnalytics(p.analytics || {});
      }
      setLoading(false);
    });
  };
  useEffect(() => { if (open && postId) load(); }, [postId, open]);

  const formatCaption = (platform: string) => {
    if (!post) return '';
    const meta = PLATFORM_META[platform];
    const tags = post.hashtags?.trim() || '';
    const cap = post.caption?.trim() || '';
    if (!tags) return cap;
    if (meta.hashtagStyle === 'firstComment') return cap;
    return `${cap}\n\n${tags}`;
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const downloadMedia = async (url: string, idx: number) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const ext = url.match(/\.(mp4|mov|webm|jpg|jpeg|png|gif)/i)?.[1] || 'jpg';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${post?.title || 'media'}-${idx + 1}.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleSave = async (markPublished: boolean) => {
    if (!post) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        platform_urls: urls,
        analytics,
        analytics_updated_at: new Date().toISOString(),
      };
      if (markPublished) {
        payload.status = 'published';
        payload.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from('scheduled_posts').update(payload).eq('id', post.id);
      if (error) throw error;
      toast({ title: markPublished ? 'Marked as published' : 'Saved' });
      onPublished?.();
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    if (!post) return;
    const { error } = await supabase.from('scheduled_posts').update({
      approval_status: 'pending_admin',
      submitted_for_approval_at: new Date().toISOString(),
      rejection_reason: null,
    }).eq('id', post.id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Submitted for admin approval' });
    load(); onPublished?.();
  };

  const adminApprove = async () => {
    if (!post || !user) return;
    const { error } = await supabase.from('scheduled_posts').update({
      approval_status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    }).eq('id', post.id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Approved — ready to publish' });
    load(); onPublished?.();
  };

  const adminReject = async () => {
    if (!post || !rejectReason.trim()) return;
    const { error } = await supabase.from('scheduled_posts').update({
      approval_status: 'rejected',
      rejection_reason: rejectReason,
    }).eq('id', post.id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Rejected' });
    setShowReject(false); setRejectReason(''); load(); onPublished?.();
  };

  const generateClientLink = async () => {
    if (!post) return;
    setGeneratingLink(true);
    try {
      const token = post.client_approval_token || crypto.randomUUID().replace(/-/g, '');
      if (!post.client_approval_token) {
        const { error } = await supabase.from('scheduled_posts').update({
          client_approval_token: token,
          client_approval_status: 'pending',
        }).eq('id', post.id);
        if (error) throw error;
      }
      const link = `${window.location.origin}/preview/${token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: 'Client link copied', description: 'Send via WhatsApp/email' });
      load();
    } catch (err) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setGeneratingLink(false);
    }
  };

  if (!open) return null;

  const canPublish = post?.approval_status === 'approved';
  const isOwnPost = post?.created_by === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink size={18} /> Publish Helper
          </DialogTitle>
        </DialogHeader>

        {loading || !post ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-foreground">{post.title}</h3>
              <p className="text-xs text-muted-foreground">{post.media_urls.length} media file(s) • {post.platforms.length} platform(s)</p>
            </div>

            {/* Approval status banner */}
            <ApprovalBanner post={post} />

            {/* Approval actions */}
            <div className="flex flex-wrap gap-2">
              {post.approval_status === 'not_submitted' && isOwnPost && !isAdmin && (
                <Button size="sm" onClick={submitForApproval} className="gap-1.5">
                  <Send size={12} /> Submit for admin approval
                </Button>
              )}
              {post.approval_status === 'rejected' && isOwnPost && !isAdmin && (
                <Button size="sm" onClick={submitForApproval} variant="outline" className="gap-1.5">
                  <Send size={12} /> Re-submit after fixes
                </Button>
              )}
              {post.approval_status === 'pending_admin' && isAdmin && (
                <>
                  <Button size="sm" onClick={adminApprove} className="gap-1.5 bg-success hover:bg-success/90">
                    <ShieldCheck size={12} /> Approve
                  </Button>
                  <Button size="sm" onClick={() => setShowReject(true)} variant="destructive" className="gap-1.5">
                    <ShieldAlert size={12} /> Reject
                  </Button>
                </>
              )}
              {post.approval_status === 'approved' && (
                <Button size="sm" variant="outline" onClick={generateClientLink} disabled={generatingLink} className="gap-1.5">
                  {generatingLink ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  {post.client_approval_token ? 'Copy client link' : 'Generate client link'}
                </Button>
              )}
            </div>

            {showReject && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (visible to social executive)…" className="min-h-20" />
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={adminReject}>Confirm reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}><X size={12} /></Button>
                </div>
              </div>
            )}

            {/* Media downloads */}
            {post.media_urls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Step 1 — Download media</Label>
                <div className="flex flex-wrap gap-2">
                  {post.media_urls.map((url, i) => (
                    <Button key={i} type="button" size="sm" variant="outline" onClick={() => downloadMedia(url, i)} className="gap-2">
                      <Download size={12} /> File {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Per-platform sections */}
            <div className="space-y-3">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Step 2 — Post to each platform</Label>
              {!canPublish && (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                  ⚠ Posts must be approved before publishing. Manual publishing is still possible but please get approval first.
                </p>
              )}
              {post.platforms.map(platform => {
                const meta = PLATFORM_META[platform];
                if (!meta) return null;
                const Icon = meta.icon;
                const caption = formatCaption(platform);
                const tags = post.hashtags?.trim() || '';
                return (
                  <div key={platform} className={cn('rounded-lg border p-4 space-y-3', meta.color)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={16} />
                        <span className="font-semibold text-sm text-foreground">{meta.label}</span>
                        <span className="text-xs text-muted-foreground">{caption.length}/{meta.captionLimit}</span>
                      </div>
                      <a href={meta.composer} target="_blank" rel="noopener noreferrer">
                        <Button type="button" size="sm" variant="secondary" className="gap-1.5 h-7 text-xs">
                          <ExternalLink size={11} /> Open composer
                        </Button>
                      </a>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => copyText(caption, `${meta.label} caption`)} className="gap-1.5 h-7 text-xs">
                        <Copy size={11} /> Caption
                      </Button>
                      {tags && meta.hashtagStyle === 'firstComment' && (
                        <Button type="button" size="sm" variant="outline" onClick={() => copyText(tags, 'Hashtags (paste as first comment)')} className="gap-1.5 h-7 text-xs">
                          <Copy size={11} /> Hashtags (1st comment)
                        </Button>
                      )}
                    </div>
                    <Input placeholder="Paste posted URL here…" value={urls[platform] || ''} onChange={e => setUrls(u => ({ ...u, [platform]: e.target.value }))} className="h-8 text-xs" />
                  </div>
                );
              })}
            </div>

            {/* Analytics */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BarChart3 size={12} /> Step 3 — Update analytics (optional, anytime)
              </Label>
              <div className="space-y-2">
                {post.platforms.map(platform => {
                  const meta = PLATFORM_META[platform];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  const a = analytics[platform] || {};
                  return (
                    <div key={platform} className="flex items-center gap-2 p-2 rounded-md bg-card/50">
                      <Icon size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-medium w-20 capitalize">{platform}</span>
                      {(['comments', 'views', 'reach'] as const).map(key => (
                        <Input key={key} type="number" placeholder={key} value={a[key] ?? ''}
                          onChange={e => {
                            const v = e.target.value === '' ? undefined : Number(e.target.value);
                            setAnalytics(prev => ({ ...prev, [platform]: { ...prev[platform], [key]: v } }));
                          }}
                          className="h-8 text-xs" />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-glass-border">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>Save progress</Button>
              <Button onClick={() => handleSave(true)} disabled={saving} className="gap-2 ml-auto">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Mark Published
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApprovalBanner({ post }: { post: Post }) {
  const map: Record<string, { label: string; cls: string; icon: typeof ShieldCheck }> = {
    not_submitted: { label: 'Not submitted for approval', cls: 'bg-muted/40 text-muted-foreground border-muted', icon: ShieldAlert },
    pending_admin: { label: 'Pending admin approval', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Loader2 },
    approved: { label: 'Approved by admin', cls: 'bg-success/10 text-success border-success/30', icon: ShieldCheck },
    rejected: { label: 'Rejected by admin', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: ShieldAlert },
  };
  const s = map[post.approval_status] || map.not_submitted;
  const Icon = s.icon;
  return (
    <div className={cn('rounded-md border p-3 space-y-1 text-xs', s.cls)}>
      <div className="flex items-center gap-2 font-medium"><Icon size={12} /> {s.label}</div>
      {post.approval_status === 'rejected' && post.rejection_reason && (
        <p className="text-foreground/80">Reason: {post.rejection_reason}</p>
      )}
      {post.client_approval_token && (
        <p className="text-foreground/70">
          Client approval: <span className="font-medium capitalize">{post.client_approval_status}</span>
          {post.client_feedback && ` — "${post.client_feedback}"`}
        </p>
      )}
    </div>
  );
}
