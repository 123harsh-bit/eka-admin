import { useState, useEffect } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Facebook, Youtube, Linkedin, Upload, X, Loader2, Save, Send, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Client { id: string; name: string; }

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-400 bg-pink-500/20 border-pink-500/40' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-400 bg-blue-500/20 border-blue-500/40' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: 'text-red-400 bg-red-500/20 border-red-500/40' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-sky-400 bg-sky-500/20 border-sky-500/40' },
];

const MEDIA_TYPES = ['image', 'video', 'reel', 'carousel', 'story'];

export default function SocialCompose() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    client_id: '',
    title: '',
    caption: '',
    hashtags: '',
    media_type: 'image',
    platforms: [] as string[],
    scheduled_at: '',
    media_urls: [] as string[],
    notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('clients').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setClients(data);
    });
    if (editId) {
      supabase.from('scheduled_posts').select('*').eq('id', editId).single().then(({ data }) => {
        if (data) {
          setForm({
            client_id: data.client_id,
            title: data.title,
            caption: data.caption || '',
            hashtags: data.hashtags || '',
            media_type: data.media_type,
            platforms: (data.platforms as string[]) || [],
            scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
            media_urls: (data.media_urls as string[]) || [],
            notes: data.notes || '',
          });
        }
      });
    }
  }, [editId]);

  const togglePlatform = (id: string) => {
    setForm(f => ({ ...f, platforms: f.platforms.includes(id) ? f.platforms.filter(p => p !== id) : [...f.platforms, id] }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('social-media').upload(path, file);
        if (error) throw error;
        const { data } = await supabase.storage.from('social-media').createSignedUrl(path, 60 * 60 * 24 * 365);
        if (data) uploaded.push(data.signedUrl);
      }
      setForm(f => ({ ...f, media_urls: [...f.media_urls, ...uploaded] }));
      toast({ title: `${uploaded.length} file(s) uploaded` });
    } catch (err) {
      toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled' | 'ready') => {
    if (!form.client_id || !form.title || form.platforms.length === 0) {
      toast({ title: 'Missing required fields', description: 'Client, title and at least 1 platform are required.', variant: 'destructive' });
      return;
    }
    if (status === 'scheduled' && !form.scheduled_at) {
      toast({ title: 'Set a scheduled date', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client_id: form.client_id,
        title: form.title,
        caption: form.caption,
        hashtags: form.hashtags,
        media_type: form.media_type,
        platforms: form.platforms,
        media_urls: form.media_urls,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        notes: form.notes,
        status,
        created_by: user!.id,
      };
      if (editId) {
        const { error } = await supabase.from('scheduled_posts').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('scheduled_posts').insert(payload);
        if (error) throw error;
      }
      toast({ title: editId ? 'Post updated' : `Post saved as ${status}` });
      navigate('/social');
    } catch (err) {
      toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editId || !confirm('Delete this post permanently?')) return;
    await supabase.from('scheduled_posts').delete().eq('id', editId);
    toast({ title: 'Post deleted' });
    navigate('/social');
  };

  return (
    <SocialLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">{editId ? 'Edit Post' : 'New Post'}</h1>
          <p className="text-muted-foreground mt-1">Compose once, publish to multiple platforms</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Media Type</Label>
              <select value={form.media_type} onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize">
                {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Post Title (internal) *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Diwali Reel — Acme Brand" />
          </div>

          <div className="space-y-2">
            <Label>Platforms *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {PLATFORMS.map(p => {
                const active = form.platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all',
                      active ? p.color : 'border-border bg-card text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <p.icon size={16} />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Caption</Label>
            <Textarea value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Write your caption…" rows={5} />
            <p className="text-xs text-muted-foreground">{form.caption.length} characters</p>
          </div>

          <div className="space-y-1.5">
            <Label>Hashtags</Label>
            <Input value={form.hashtags} onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))} placeholder="#brand #content #reels" />
          </div>

          <div className="space-y-2">
            <Label>Media Files</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <input type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="hidden" id="media-upload" disabled={uploading} />
              <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground">
                {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                <span className="text-sm">{uploading ? 'Uploading…' : 'Click to upload images or videos'}</span>
              </label>
            </div>
            {form.media_urls.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {form.media_urls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-card group">
                    {url.match(/\.(mp4|mov|webm)/i) ? (
                      <video src={url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button onClick={() => setForm(f => ({ ...f, media_urls: f.media_urls.filter((_, j) => j !== i) }))} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Schedule Date & Time</Label>
            <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Internal Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes for admin or yourself…" rows={2} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-2">
            <Save size={14} /> Save Draft
          </Button>
          <Button variant="secondary" onClick={() => handleSave('scheduled')} disabled={saving} className="gap-2">
            Schedule
          </Button>
          <Button onClick={() => handleSave('ready')} disabled={saving} className="gap-2 ml-auto">
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Send size={14} /> Mark Ready to Publish
          </Button>
          {editId && (
            <Button variant="ghost" onClick={handleDelete} className="text-destructive">
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </SocialLayout>
  );
}
