import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { VIDEO_STATUS_ORDER, VIDEO_STATUSES } from '@/lib/statusConfig';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

interface Tpl {
  id: string;
  stage: string;
  name: string;
  template_text: string;
  client_id: string | null;
  is_active: boolean;
}

export default function AdminWhatsAppTemplates() {
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({ stage: 'client_review', name: '', template_text: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('whatsapp_templates').select('*').order('stage');
    setTpls((data || []) as Tpl[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!draft.name || !draft.template_text) return toast.error('Name and message required');
    const { error } = await supabase.from('whatsapp_templates').insert({
      stage: draft.stage, name: draft.name, template_text: draft.template_text,
    });
    if (error) return toast.error(error.message);
    setDraft({ stage: 'client_review', name: '', template_text: '' });
    toast.success('Template added');
    load();
  };

  const update = async (id: string, patch: Partial<Tpl>) => {
    const { error } = await supabase.from('whatsapp_templates').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('whatsapp_templates').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Deleted');
    load();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
          <p className="text-muted-foreground mt-1">
            Variables: <code>{'{client}'}</code>, <code>{'{title}'}</code>, <code>{'{shoot_date}'}</code>, <code>{'{link}'}</code>
          </p>
        </div>

        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">New template</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={draft.stage} onValueChange={v => setDraft(d => ({ ...d, stage: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VIDEO_STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s}>{VIDEO_STATUSES[s].emoji} {VIDEO_STATUSES[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Template name" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            <Button onClick={add} className="gap-2"><Plus className="w-4 h-4" /> Add</Button>
          </div>
          <Textarea
            placeholder="Hi {client}, your video '{title}' is ready: {link}"
            value={draft.template_text}
            onChange={e => setDraft(d => ({ ...d, template_text: e.target.value }))}
            rows={3}
          />
        </Card>

        {loading ? <p className="text-muted-foreground">Loading…</p> : (
          <div className="space-y-3">
            {tpls.map(t => (
              <Card key={t.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-muted">{VIDEO_STATUSES[t.stage as keyof typeof VIDEO_STATUSES]?.label || t.stage}</span>
                    <Input value={t.name} onChange={e => setTpls(p => p.map(x => x.id === t.id ? { ...x, name: e.target.value } : x))} onBlur={e => update(t.id, { name: e.target.value })} className="max-w-xs" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={t.is_active} onCheckedChange={v => update(t.id, { is_active: v })} />
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                <Textarea
                  value={t.template_text}
                  onChange={e => setTpls(p => p.map(x => x.id === t.id ? { ...x, template_text: e.target.value } : x))}
                  onBlur={e => update(t.id, { template_text: e.target.value })}
                  rows={2}
                />
              </Card>
            ))}
            {tpls.length === 0 && <p className="text-muted-foreground text-center py-12">No templates yet.</p>}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
