import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus2, Info } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
  /** Pre-selected link, useful when opening from a Video / Writing Task detail */
  defaults?: {
    videoId?: string;
    writingTaskId?: string;
    contentItemId?: string;
    clientId?: string;
    title?: string;
  };
}

interface Option { id: string; label: string; sub?: string }

export function NewScriptModal({ open, onOpenChange, onCreated, defaults }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [videoId, setVideoId] = useState('');
  const [contentItemId, setContentItemId] = useState('');
  const [clients, setClients] = useState<Option[]>([]);
  const [tasks, setTasks] = useState<Option[]>([]);
  const [videos, setVideos] = useState<Option[]>([]);
  const [contentItems, setContentItems] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(defaults?.title || '');
    setClientId(defaults?.clientId || '');
    setTaskId(defaults?.writingTaskId || '');
    setVideoId(defaults?.videoId || '');
    setContentItemId(defaults?.contentItemId || '');

    supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setClients((data || []).map((c) => ({ id: c.id, label: c.name }))));

    supabase
      .from('writing_tasks')
      .select('id, title, clients(name)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) =>
        setTasks(
          (data || []).map((t) => ({
            id: t.id,
            label: t.title,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sub: (t as any).clients?.name,
          }))
        )
      );

    supabase
      .from('videos')
      .select('id, title, status, client_id, clients(name)')
      .order('created_at', { ascending: false })
      .limit(400)
      .then(({ data }) =>
        setVideos(
          (data || []).map((v) => ({
            id: v.id,
            label: v.title,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sub: (v as any).clients?.name,
          }))
        )
      );

    supabase
      .from('content_items')
      .select('id, title, client_id, clients(name)')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) =>
        setContentItems(
          (data || []).map((c) => ({
            id: c.id,
            label: c.title,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sub: (c as any).clients?.name,
          }))
        )
      );
  }, [open, defaults]);

  // When a video is picked, auto-fill client
  useEffect(() => {
    if (!videoId) return;
    (async () => {
      const { data } = await supabase.from('videos').select('client_id, title').eq('id', videoId).maybeSingle();
      if (data?.client_id) setClientId((c) => c || data.client_id);
      if (!title && data?.title) setTitle(`${data.title} — Script`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const create = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    setBusy(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('create_script', {
      _title: title.trim(),
      _client_id: clientId || null,
      _linked_writing_task_id: taskId || null,
      _linked_video_id: videoId || null,
      _linked_content_item_id: contentItemId || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not create script', description: error.message, variant: 'destructive' });
      return;
    }
    onCreated(data as string);
    onOpenChange(false);
    setTitle(''); setClientId(''); setTaskId(''); setVideoId(''); setContentItemId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 size={18} /> New script
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Diwali reel — voice over draft"
              autoFocus
            />
          </div>

          <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info size={12} /> Link this script to any existing project (optional)
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Video / Project</Label>
              <select
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— None —</option>
                {videos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}{v.sub ? ` · ${v.sub}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Writing task</Label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— None —</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}{t.sub ? ` · ${t.sub}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Content plan item</Label>
              <select
                value={contentItemId}
                onChange={(e) => setContentItemId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— None —</option>
                {contentItems.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}{c.sub ? ` · ${c.sub}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Client</Label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— None —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy} className="gap-2">
              {busy && <Loader2 size={14} className="animate-spin" />} Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
