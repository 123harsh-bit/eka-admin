import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// base64 <-> Uint8Array helpers (browser-safe)
const bytesToBase64 = (bytes: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
const base64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

export interface UseYProviderArgs {
  scriptId: string;
  userId: string;
  userName: string;
  userColor: string;
  canEdit: boolean;
}

export interface YProviderState {
  ydoc: Y.Doc;
  awareness: Awareness;
  status: 'connecting' | 'connected' | 'error';
  peers: number;
  /** true once the stored snapshot (if any) has been loaded into the doc */
  hydrated: boolean;
  /** true when no usable snapshot existed and the doc started empty */
  needsSeed: boolean;
}


export function useYSupabaseProvider({
  scriptId,
  userId,
  userName,
  userColor,
  canEdit,
}: UseYProviderArgs): YProviderState {
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [peers, setPeers] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);


  if (!ydocRef.current) ydocRef.current = new Y.Doc();
  if (!awarenessRef.current) awarenessRef.current = new Awareness(ydocRef.current);

  useEffect(() => {
    const ydoc = ydocRef.current!;
    const awareness = awarenessRef.current!;
    let channel: RealtimeChannel | null = null;
    let cancelled = false;
    let applyingRemote = false;

    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
    });

    const start = async () => {
      // Load initial snapshot from the text column (reliable base64 round-trip)
      let loaded = false;
      try {
        const { data } = await supabase
          .from('scripts')
          .select('ydoc_b64')
          .eq('id', scriptId)
          .single();
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = (data as any)?.ydoc_b64 as string | null | undefined;
        if (state) {
          try {
            const bytes = base64ToBytes(state);
            if (bytes.byteLength > 0) {
              applyingRemote = true;
              Y.applyUpdate(ydoc, bytes, 'load');
              applyingRemote = false;
              loaded = true;
            }
          } catch {
            // ignore malformed snapshot
          }
        }
      } catch {
        // no snapshot yet
      }
      if (cancelled) return;
      setNeedsSeed(!loaded);
      setHydrated(true);


      channel = supabase.channel(`script:${scriptId}`, {
        config: { broadcast: { self: false }, presence: { key: userId } },
      });

      channel
        .on('broadcast', { event: 'y-update' }, ({ payload }) => {
          try {
            const bytes = base64ToBytes(payload.update as string);
            applyingRemote = true;
            Y.applyUpdate(ydoc, bytes, 'remote');
            applyingRemote = false;
          } catch {
            /* noop */
          }
        })
        .on('broadcast', { event: 'y-awareness' }, ({ payload }) => {
          try {
            const bytes = base64ToBytes(payload.update as string);
            // Awareness updates piggyback via Yjs awareness protocol.
            import('y-protocols/awareness').then((m) => {
              m.applyAwarenessUpdate(awareness, bytes, 'remote');
            });
          } catch {
            /* noop */
          }
        })
        .on('broadcast', { event: 'state-request' }, ({ payload }) => {
          if (payload.from === userId) return;
          const full = Y.encodeStateAsUpdate(ydoc);
          channel?.send({
            type: 'broadcast',
            event: 'y-update',
            payload: { update: bytesToBase64(full) },
          });
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel!.presenceState();
          setPeers(Object.keys(state).length);
        })
        .on('presence', { event: 'join' }, () => {
          // Re-broadcast our current state so joiners catch up.
          const full = Y.encodeStateAsUpdate(ydoc);
          if (full.byteLength > 0) {
            channel?.send({
              type: 'broadcast',
              event: 'y-update',
              payload: { update: bytesToBase64(full) },
            });
          }
        });

      channel.subscribe(async (s) => {
        if (s === 'SUBSCRIBED') {
          setStatus('connected');
          await channel!.track({ user_id: userId, name: userName, color: userColor });
          // Ask existing peers for their state.
          channel!.send({
            type: 'broadcast',
            event: 'state-request',
            payload: { from: userId },
          });
        } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
          setStatus('error');
        }
      });
    };

    const onLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (applyingRemote || origin === 'remote' || origin === 'load') return;
      if (!channel) return;
      channel.send({
        type: 'broadcast',
        event: 'y-update',
        payload: { update: bytesToBase64(update) },
      });
    };
    ydoc.on('update', onLocalUpdate);

    const onAwarenessUpdate = async ({
      added,
      updated,
      removed,
    }: { added: number[]; updated: number[]; removed: number[] }) => {
      if (!channel) return;
      const changed = added.concat(updated, removed);
      const m = await import('y-protocols/awareness');
      const update = m.encodeAwarenessUpdate(awareness, changed);
      channel.send({
        type: 'broadcast',
        event: 'y-awareness',
        payload: { update: bytesToBase64(update) },
      });
    };
    awareness.on('update', onAwarenessUpdate);

    start();

    return () => {
      cancelled = true;
      ydoc.off('update', onLocalUpdate);
      awareness.off('update', onAwarenessUpdate);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId, userId]);

  return {
    ydoc: ydocRef.current!,
    awareness: awarenessRef.current!,
    status,
    peers,
  };
}

export const encodeSnapshotBase64 = (ydoc: Y.Doc): string =>
  bytesToBase64(Y.encodeStateAsUpdate(ydoc));
