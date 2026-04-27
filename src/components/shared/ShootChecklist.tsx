import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, X, ListChecks } from 'lucide-react';

export type ChecklistItem = { id: string; label: string; checked: boolean };

const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: 'cam', label: 'Camera & lenses', checked: false },
  { id: 'audio', label: 'Audio equipment', checked: false },
  { id: 'lights', label: 'Lighting setup', checked: false },
  { id: 'permission', label: 'Location permission', checked: false },
  { id: 'backup', label: 'Backup storage drive', checked: false },
];

interface Props {
  videoId: string;
  initial: ChecklistItem[] | null;
  readOnly?: boolean;
  onChange?: (items: ChecklistItem[]) => void;
}

export function ShootChecklist({ videoId, initial, readOnly, onChange }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>(
    initial && initial.length ? initial : DEFAULT_ITEMS
  );
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const persist = async (next: ChecklistItem[]) => {
    setItems(next);
    onChange?.(next);
    setSaving(true);
    const { error } = await supabase
      .from('videos')
      .update({ shoot_checklist: next as any })
      .eq('id', videoId);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const toggle = (id: string) => {
    persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const add = () => {
    if (!newLabel.trim()) return;
    persist([...items, { id: crypto.randomUUID(), label: newLabel.trim(), checked: false }]);
    setNewLabel('');
  };

  const remove = (id: string) => {
    persist(items.filter(i => i.id !== id));
  };

  const completed = items.filter(i => i.checked).length;
  const allDone = items.length > 0 && completed === items.length;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListChecks size={14} className="text-primary" />
          <h3 className="text-sm font-semibold">Shoot Checklist</h3>
        </div>
        <span className={`text-[11px] font-medium ${allDone ? 'text-success' : 'text-muted-foreground'}`}>
          {completed}/{items.length} {allDone && '✓ Ready'}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2 group py-1">
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => toggle(item.id)}
              disabled={readOnly}
              id={`chk-${item.id}`}
            />
            <label htmlFor={`chk-${item.id}`}
              className={`flex-1 text-xs cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {item.label}
            </label>
            {!readOnly && (
              <button onClick={() => remove(item.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex gap-1.5">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add(); }}
            placeholder="Add checklist item…"
            className="h-8 text-xs"
          />
          <Button size="sm" onClick={add} disabled={!newLabel.trim()} className="h-8 px-2.5">
            <Plus size={12} />
          </Button>
        </div>
      )}
      {saving && <p className="text-[10px] text-muted-foreground mt-1.5">Saving…</p>}
    </div>
  );
}
