import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save, Loader2, CheckCircle, Clock, Timer, Camera, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DoneItem { id: string; title: string; client_id: string; when: string; }

const DONE_STATUSES: Record<string, string[]> = {
  editor: ['approved', 'ready_to_upload', 'live'],
  camera_operator: ['footage_delivered', 'editing', 'internal_review', 'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'],
  writer: ['delivered', 'approved'],
  designer: ['delivered'],
  social_executive: ['live'],
};

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Downscale an image file to a small square data URL so it can live on the profile row. */
function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas unavailable'));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function MyProfilePage() {
  const { user, profile, role } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<DoneItem[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, string>>({});
  const [minutesByMonth, setMinutesByMonth] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { key: monthKey(d), label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) };
    });
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(months[0].key);

  useEffect(() => {
    setFullName(profile?.full_name || '');
    setPhone(profile?.phone || '');
    setAvatar(profile?.avatar_url || null);
  }, [profile]);

  useEffect(() => {
    if (!user || !role) return;
    (async () => {
      setLoading(true);
      const done = DONE_STATUSES[role] || [];
      let rows: { id: string; title: string; client_id: string; status: string; updated_at: string }[] = [];

      if (role === 'editor' || role === 'camera_operator' || role === 'social_executive') {
        const col = role === 'editor' ? 'assigned_editor' : role === 'camera_operator' ? 'assigned_camera_operator' : 'assigned_social_id';
        const { data } = await supabase.from('videos')
          .select('id, title, client_id, status, updated_at')
          .eq(col, user.id);
        rows = data || [];
      } else if (role === 'writer') {
        const { data } = await supabase.from('writing_tasks')
          .select('id, title, client_id, status, updated_at')
          .eq('assigned_writer', user.id);
        rows = data || [];
      } else if (role === 'designer') {
        const { data } = await supabase.from('design_tasks')
          .select('id, title, client_id, status, updated_at')
          .eq('assigned_designer', user.id);
        rows = data || [];
      }

      const completed = rows
        .filter(r => done.includes(r.status))
        .map(r => ({ id: r.id, title: r.title, client_id: r.client_id, when: r.updated_at }))
        .sort((a, b) => (b.when || '').localeCompare(a.when || ''));
      setItems(completed);

      const ids = [...new Set(completed.map(c => c.client_id).filter(Boolean))];
      if (ids.length) {
        const { data: cs } = await supabase.from('clients').select('id, name').in('id', ids);
        const map: Record<string, string> = {};
        cs?.forEach(c => { map[c.id] = c.name; });
        setClientMap(map);
      }

      const { data: sessions } = await supabase.from('work_sessions')
        .select('started_at, duration_minutes')
        .eq('user_id', user.id)
        .not('duration_minutes', 'is', null);
      const mins: Record<string, number> = {};
      sessions?.forEach(s => {
        const k = monthKey(new Date(s.started_at));
        mins[k] = (mins[k] || 0) + Number(s.duration_minutes || 0);
      });
      setMinutesByMonth(mins);

      setLoading(false);
    })();
  }, [user, role]);

  const pickPhoto = async (file?: File | null) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const { error } = await supabase.from('profiles').update({ avatar_url: dataUrl }).eq('id', user.id);
      if (error) throw error;
      setAvatar(dataUrl);
      toast({ title: 'Profile photo updated' });
    } catch (e) {
      toast({ title: "Couldn't update photo", description: (e as Error).message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save profile", description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Profile updated' });
  };

  const monthItems = items.filter(i => monthKey(new Date(i.when)) === selectedMonth);
  const monthMinutes = Math.round(minutesByMonth[selectedMonth] || 0);
  const hours = monthMinutes >= 60 ? `${Math.floor(monthMinutes / 60)}h ${monthMinutes % 60}m` : `${monthMinutes}m`;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold overflow-hidden">
            {avatar
              ? <img src={avatar} alt="My profile photo" className="h-full w-full object-cover" />
              : (profile?.full_name || '?').charAt(0)}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => pickPhoto(e.target.files?.[0])} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">My Details</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Full name</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mobile number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91…" className="h-9 text-sm" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">Email changes are handled by your admin to keep your account data safe.</p>
        <Button size="sm" onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes
        </Button>
      </div>

      {/* Appearance */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Moon size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: 'dark', label: 'Dark mode', hint: 'Electric blue on black', icon: Moon },
            { key: 'light', label: 'Light mode', hint: 'Electric blue on white', icon: Sun },
          ] as const).map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setTheme(opt.key)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border text-left transition-colors',
                theme === opt.key ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'
              )}
            >
              <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center',
                opt.key === 'dark' ? 'bg-foreground/90 text-background' : 'bg-muted text-foreground')}>
                <opt.icon size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{opt.label}</span>
                <span className="block text-[11px] text-muted-foreground truncate">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Work history */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-success" />
            <h2 className="text-sm font-semibold text-foreground">My Work History</h2>
          </div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
          >
            {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-success/10 border border-success/30">
            <CheckCircle size={12} className="text-success" />
            <span className="text-lg font-bold text-foreground">{monthItems.length}</span>
            <span className="text-[10px] text-muted-foreground">completed</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
            <Timer size={12} className="text-primary" />
            <span className="text-lg font-bold text-foreground">{hours}</span>
            <span className="text-[10px] text-muted-foreground">logged</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/50 border border-border">
            <Clock size={12} className="text-muted-foreground" />
            <span className="text-lg font-bold text-foreground">{items.length}</span>
            <span className="text-[10px] text-muted-foreground">all-time completed</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />)}</div>
        ) : monthItems.length === 0 ? (
          <p className="text-xs text-muted-foreground">No completed work recorded for this month.</p>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
            {monthItems.map(it => (
              <div key={it.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-success/5 border border-success/20">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium truncate">{it.title}</p>
                  <p className="text-[10px] text-muted-foreground">{clientMap[it.client_id] || 'Unknown client'}</p>
                </div>
                <span className="text-[10px] text-success ml-2 flex-shrink-0">
                  {new Date(it.when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
