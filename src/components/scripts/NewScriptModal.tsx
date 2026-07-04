import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FilePlus2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}

interface Option { id: string; label: string; }

export function NewScriptModal({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [clients, setClients] = useState<Option[]>([]);
  const [tasks, setTasks] = useState<Option[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from('clients')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setClients((data || []).map((c) => ({ id: c.id, label: c.name }))));
    supabase
      .from('writing_tasks')
      .select('id, title')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setTasks((data || []).map((t) => ({ id: t.id, label: t.title }))));
  }, [open]);

  const create = async () => {
    if (!user) return;
    if (!title.trim()) {
      toast({ title: 'Please enter a title', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from('scripts')
      .insert({
        title: title.trim(),
        created_by: user.id,
        updated_by: user.id,
        client_id: clientId || null,
        linked_writing_task_id: taskId || null,
      })
      .select('id')
      .single();
    setBusy(false);
    if (error) {
      toast({ title: 'Could not create script', description: error.message, variant: 'destructive' });
      return;
    }
    onCreated(data.id);
    onOpenChange(false);
    setTitle(''); setClientId(''); setTaskId('');
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
          <div className="space-y-1.5">
            <Label>Client (optional)</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— None —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Link to writing task (optional)</Label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— None —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
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
