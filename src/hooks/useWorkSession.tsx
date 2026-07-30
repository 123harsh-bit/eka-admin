import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type WorkEntityType = 'video' | 'writing_task' | 'design_task' | 'shoot' | 'social_post';

export interface WorkSession {
  id: string;
  user_id: string;
  entity_type: WorkEntityType;
  entity_id: string;
  entity_title: string | null;
  client_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

interface StartArgs {
  entityType: WorkEntityType;
  entityId: string;
  title?: string | null;
  clientId?: string | null;
}

const db = supabase as unknown as {
  from: (t: string) => any;
};

/**
 * Tracks the single "task I'm working on right now" for the signed-in team member.
 * Independent of pipeline status, so admins can see real activity at any stage.
 */
export function useWorkSession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setActive(null); setLoading(false); return; }
    const { data } = await db.from('work_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);
    setActive((data?.[0] as WorkSession) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const start = useCallback(async ({ entityType, entityId, title, clientId }: StartArgs) => {
    if (!user || busy) return;
    setBusy(true);
    // Only one active task per person — close whatever is running first.
    await db.from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('ended_at', null);

    const { data, error } = await db.from('work_sessions').insert({
      user_id: user.id,
      entity_type: entityType,
      entity_id: entityId,
      entity_title: title ?? null,
      client_id: clientId ?? null,
    }).select().single();

    setBusy(false);
    if (error) {
      toast({ title: "Couldn't start work timer", description: error.message, variant: 'destructive' });
      return;
    }
    setActive(data as WorkSession);
    toast({ title: 'Working on it', description: title || 'Timer started — your admin can see you started.' });
  }, [user, busy, toast]);

  const stop = useCallback(async () => {
    if (!user || !active || busy) return;
    setBusy(true);
    const { error } = await db.from('work_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', active.id);
    setBusy(false);
    if (error) {
      toast({ title: "Couldn't stop work timer", description: error.message, variant: 'destructive' });
      return;
    }
    setActive(null);
    toast({ title: 'Work paused', description: 'Time logged.' });
  }, [user, active, busy, toast]);

  const isActiveOn = useCallback(
    (entityId: string) => active?.entity_id === entityId,
    [active],
  );

  return { active, loading, busy, start, stop, refresh, isActiveOn };
}

/** Live "1h 12m" style elapsed label that ticks every 30s. */
export function useElapsedLabel(startedAt?: string | null) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, [startedAt]);

  if (!startedAt) return null;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
