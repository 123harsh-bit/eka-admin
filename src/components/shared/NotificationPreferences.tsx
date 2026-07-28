import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Prefs {
  assignments: boolean;
  deadlines: boolean;
  approvals: boolean;
  client_feedback: boolean;
  daily_digest: boolean;
}

const DEFAULTS: Prefs = {
  assignments: true,
  deadlines: true,
  approvals: true,
  client_feedback: true,
  daily_digest: true,
};

const ROWS: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: 'assignments', label: 'Task assignments', hint: 'When something new is assigned to you' },
  { key: 'deadlines', label: 'Deadline alerts', hint: 'Due soon and overdue reminders' },
  { key: 'approvals', label: 'Approvals', hint: 'Approvals and status sign-offs' },
  { key: 'client_feedback', label: 'Client feedback', hint: 'Comments, ratings and revision requests' },
  { key: 'daily_digest', label: 'Daily email digest', hint: 'One morning email with your due items' },
];

export function NotificationPreferences({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULTS, ...(data as Prefs) });
      setLoading(false);
    })();
  }, [user]);

  const update = async (key: keyof Prefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const { error } = await (supabase as any)
      .from('notification_preferences')
      .upsert({ user_id: user.id, ...next }, { onConflict: 'user_id' });
    if (error) {
      toast.error('Could not save preference');
      setPrefs(prefs);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="animate-spin text-muted-foreground" size={16} /></div>;
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {ROWS.map(r => (
        <div key={r.key} className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={compact ? 'text-xs text-foreground' : 'text-sm text-foreground'}>{r.label}</p>
            {!compact && <p className="text-xs text-muted-foreground">{r.hint}</p>}
          </div>
          <Switch checked={prefs[r.key]} onCheckedChange={v => update(r.key, v)} />
        </div>
      ))}
    </div>
  );
}
