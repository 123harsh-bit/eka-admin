import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Instagram, Facebook, Youtube, Linkedin,
  Copy, Download, ExternalLink, CheckCircle2, Loader2, BarChart3,
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
  analytics: Record<string, { likes?: number; comments?: number; views?: number; reach?: number }>;
}

const PLATFORM_META: Record<string, {
  label: string;
  icon: typeof Instagram;
  color: string;
  composer: string;
  captionLimit: number;
  hashtagStyle: 'inline' | 'firstComment' | 'append';
}> = {
  instagram: {
    label: 'Instagram', icon: Instagram, color: 'text-pink-400 border-pink-500/40 bg-pink-500/10',
    composer: 'https://www.instagram.com/', captionLimit: 2200, hashtagStyle: 'firstComment',
  },
  facebook: {
    label: 'Facebook', icon: Facebook, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
    composer: 'https://www.facebook.com/', captionLimit: 63206, hashtagStyle: 'append',
  },
  youtube: {
    label: 'YouTube', icon: Youtube, color: 'text-red-400 border-red-500/40 bg-red-500/10',
    composer: 'https://studio.youtube.com/channel/UC/videos/upload', captionLimit: 5000, hashtagStyle: 'append',
  },
  linkedin: {
    label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
    composer: 'https://www.linkedin.com/feed/?shareActive=true', captionLimit: 3000, hashtagStyle: 'append',
  },
};

interface Props {
  postId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function PublishHelper({ postId, open, onOpenChange, onPublished }: Props) {
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [analytics, setAnalytics] = useState<Record<string, { likes?: number; comments?: number; views?: number; reach?: number }>>({});

  useEffect(() => {
    if (!postId || !open) return;
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
  }, [postId, open]);

  const formatCaption = (platform: string) => {
    if (!post) return '';
    const meta = PLATFORM_META[platform];
    const tags = post.hashtags?.trim() || '';
    const cap = post.caption?.trim() || '';
    if (!tags) return cap;
    if (meta.hashtagStyle === 'firstComment') return cap; // user pastes tags as first comment
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

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink size={18} /> Publish Helper
          </DialogTitle>
        </DialogHeader>

        {loading || !post ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground">{post.title}</h3>
              <p className="text-xs text-muted-foreground">{post.media_urls.length} media file(s) • {post.platforms.length} platform(s)</p>
            </div>

            {/* Quick media downloads */}
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

                    <Input
                      placeholder="Paste posted URL here…"
                      value={urls[platform] || ''}
                      onChange={e => setUrls(u => ({ ...u, [platform]: e.target.value }))}
                      className="h-8 text-xs"
                    />
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
                      {(['likes', 'comments', 'views', 'reach'] as const).map(key => (
                        <Input
                          key={key}
                          type="number"
                          placeholder={key}
                          value={a[key] ?? ''}
                          onChange={e => {
                            const v = e.target.value === '' ? undefined : Number(e.target.value);
                            setAnalytics(prev => ({ ...prev, [platform]: { ...prev[platform], [key]: v } }));
                          }}
                          className="h-8 text-xs"
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-glass-border">
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                Save progress
              </Button>
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
