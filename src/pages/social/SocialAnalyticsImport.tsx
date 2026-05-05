import { useEffect, useState } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Sparkles, Loader2, FileText, Image as ImageIcon, Save } from 'lucide-react';

interface Post { id: string; title: string; platforms: string[]; analytics: Record<string, Record<string, number>>; }

export default function SocialAnalyticsImport() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('scheduled_posts').select('id,title,platforms,analytics,platform_urls').eq('status', 'published').order('published_at', { ascending: false }).limit(200)
      .then(({ data }) => setPosts((data as unknown as Post[]) || []));
  }, []);

  const importCsv = async (file: File) => {
    setBusy(true); setResult(null);
    try {
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idx = (k: string) => header.indexOf(k);
      const iId = idx('post_id'); const iPlat = idx('platform');
      const iComments = idx('comments'); const iViews = idx('views'); const iReach = idx('reach');
      if (iId < 0 || iPlat < 0) throw new Error('CSV must have columns: post_id, platform, comments, views, reach');
      let updated = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',');
        const id = cells[iId]?.trim();
        const platform = cells[iPlat]?.trim().toLowerCase();
        if (!id || !platform) continue;
        const post = posts.find(p => p.id === id);
        if (!post) continue;
        const newAnalytics = {
          ...(post.analytics || {}),
          [platform]: {
            ...(post.analytics?.[platform] || {}),
            
            ...(iComments >= 0 && cells[iComments] ? { comments: Number(cells[iComments]) } : {}),
            ...(iViews >= 0 && cells[iViews] ? { views: Number(cells[iViews]) } : {}),
            ...(iReach >= 0 && cells[iReach] ? { reach: Number(cells[iReach]) } : {}),
          },
        };
        await supabase.from('scheduled_posts').update({ analytics: newAnalytics, analytics_updated_at: new Date().toISOString() }).eq('id', id);
        updated++;
      }
      setResult(`✓ Updated ${updated} post(s) from CSV`);
      toast({ title: `Updated ${updated} post(s)` });
    } catch (err) {
      toast({ title: 'CSV import failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const csv = 'post_id,platform,comments,views,reach\n' + posts.slice(0, 5).map(p =>
      p.platforms.map(plat => `${p.id},${plat},,,`).join('\n')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'analytics-template.csv'; a.click();
  };

  return (
    <SocialLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Bulk Analytics Import</h1>
          <p className="text-muted-foreground mt-1">Upload CSV exports or screenshots to update many posts at once</p>
        </div>

        {/* CSV import */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-primary" />
            <h2 className="font-semibold">CSV Import</h2>
          </div>
          <p className="text-xs text-muted-foreground">Required columns: <code>post_id, platform, comments, views, reach</code></p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-2">
              <FileText size={12} /> Download template ({posts.length} posts)
            </Button>
            <label>
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && importCsv(e.target.files[0])} />
              <Button size="sm" disabled={busy} className="gap-2" asChild>
                <span>{busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload CSV</span>
              </Button>
            </label>
          </div>
          {result && <p className="text-xs text-success">{result}</p>}
        </div>

        {/* Screenshot AI extraction */}
        <ScreenshotImport posts={posts} />
      </div>
    </SocialLayout>
  );
}

function ScreenshotImport({ posts }: { posts: Post[] }) {
  const { toast } = useToast();
  const [postId, setPostId] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<Record<string, number> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!postId) return toast({ title: 'Select a post first', variant: 'destructive' });
    setBusy(true); setExtracted(null);
    try {
      const path = `analytics-screenshots/${postId}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('social-media').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from('social-media').createSignedUrl(path, 600);
      if (!signed?.signedUrl) throw new Error('Could not get signed URL');
      setPreviewUrl(URL.createObjectURL(file));
      const { data, error } = await supabase.functions.invoke('social-ai-tools', {
        body: { mode: 'extract_analytics', imageUrl: signed.signedUrl, platform },
      });
      if (error) throw error;
      setExtracted(data.analytics || {});
      toast({ title: 'Numbers extracted — review and save' });
    } catch (err) {
      toast({ title: 'Extraction failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const save = async () => {
    if (!postId || !extracted) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const newAnalytics = {
      ...(post.analytics || {}),
      [platform]: { ...(post.analytics?.[platform] || {}), ...extracted },
    };
    const { error } = await supabase.from('scheduled_posts').update({
      analytics: newAnalytics, analytics_updated_at: new Date().toISOString(),
    }).eq('id', postId);
    if (error) return toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    toast({ title: 'Analytics updated' });
    setExtracted(null); setPreviewUrl(null);
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <h2 className="font-semibold">Screenshot → AI Extract</h2>
      </div>
      <p className="text-xs text-muted-foreground">Upload an analytics screenshot from Instagram/YouTube/LinkedIn. AI reads the numbers.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Post</Label>
          <select value={postId} onChange={e => setPostId(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select a published post…</option>
            {posts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Platform</Label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="youtube">YouTube</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
      </div>
      <label>
        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <Button size="sm" disabled={busy || !postId} className="gap-2" asChild>
          <span>{busy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />} Upload screenshot</span>
        </Button>
      </label>
      {previewUrl && <img src={previewUrl} alt="" className="max-h-48 rounded border border-border" />}
      {extracted && (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 space-y-2">
          <p className="text-xs font-medium">Extracted numbers (review):</p>
          <div className="grid grid-cols-3 gap-2">
            {(['comments', 'views', 'reach'] as const).map(k => (
              <div key={k}>
                <Label className="text-[10px] uppercase">{k}</Label>
                <Input type="number" value={extracted[k] ?? ''} onChange={e => setExtracted(p => ({ ...p, [k]: Number(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
            ))}
          </div>
          <Button size="sm" onClick={save} className="gap-2"><Save size={12} /> Save to post</Button>
        </div>
      )}
    </div>
  );
}
