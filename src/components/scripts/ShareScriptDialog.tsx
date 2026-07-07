import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserPlus, Shield, X, Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scriptId: string;
  ownerId: string;
  canManage: boolean; // owner or admin
}

interface Member { id: string; full_name: string; email?: string | null }
interface Collaborator { id: string; user_id: string; role: 'viewer' | 'editor' }

const ROLES: { value: 'viewer' | 'editor'; label: string; icon: typeof Eye }[] = [
  { value: 'editor', label: 'Editor', icon: Pencil },
  { value: 'viewer', label: 'Viewer', icon: Eye },
];

export function ShareScriptDialog({ open, onOpenChange, scriptId, ownerId, canManage }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [ownerProfile, setOwnerProfile] = useState<Member | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: cs }, { data: owner }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
      supabase.from('script_collaborators').select('id, user_id, role').eq('script_id', scriptId),
      supabase.from('profiles').select('id, full_name, email').eq('id', ownerId).maybeSingle(),
    ]);
    setMembers((profs || []) as Member[]);
    setCollabs(((cs || []) as Collaborator[]));
    setOwnerProfile(owner as Member | null);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();
    const ch = supabase
      .channel(`share-${scriptId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'script_collaborators', filter: `script_id=eq.${scriptId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scriptId]);

  const collabByUser = new Map(collabs.map((c) => [c.user_id, c] as const));

  const invite = async (userId: string, role: 'viewer' | 'editor') => {
    setBusy(userId);
    const { error } = await supabase
      .from('script_collaborators')
      .insert({ script_id: scriptId, user_id: userId, role });
    setBusy('');
    if (error) {
      toast({ title: 'Could not add collaborator', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Collaborator added' });
  };

  const changeRole = async (userId: string, role: 'viewer' | 'editor') => {
    setBusy(userId);
    const { error } = await supabase
      .from('script_collaborators')
      .update({ role })
      .eq('script_id', scriptId)
      .eq('user_id', userId);
    setBusy('');
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
  };

  const remove = async (userId: string) => {
    setBusy(userId);
    const { error } = await supabase
      .from('script_collaborators')
      .delete()
      .eq('script_id', scriptId)
      .eq('user_id', userId);
    setBusy('');
    if (error) toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
  };

  const filtered = members.filter(
    (m) =>
      m.id !== ownerId &&
      (m.full_name?.toLowerCase().includes(q.toLowerCase()) ||
        m.email?.toLowerCase().includes(q.toLowerCase()))
  );

  const withCollab = filtered.filter((m) => collabByUser.has(m.id));
  const withoutCollab = filtered.filter((m) => !collabByUser.has(m.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Share script</DialogTitle>
        </DialogHeader>

        {!canManage && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500">
            Only the script owner or an admin can manage collaborators. You can view the list.
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search teammates by name or email…"
            className="pl-9 h-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {ownerProfile && (
                <section className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Owner</p>
                  <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield size={14} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{ownerProfile.full_name || ownerProfile.email}</p>
                        {ownerProfile.email && <p className="text-[11px] text-muted-foreground truncate">{ownerProfile.email}</p>}
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">Full access</span>
                  </div>
                </section>
              )}

              {withCollab.length > 0 && (
                <section className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Shared with ({withCollab.length})
                  </p>
                  <div className="space-y-1.5">
                    {withCollab.map((m) => {
                      const c = collabByUser.get(m.id)!;
                      return (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/50 hover:bg-muted/20">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{m.full_name || m.email}</p>
                            {m.email && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canManage ? (
                              <>
                                <select
                                  value={c.role}
                                  onChange={(e) => changeRole(m.id, e.target.value as 'viewer' | 'editor')}
                                  disabled={busy === m.id}
                                  className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                                >
                                  {ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => remove(m.id)}
                                  disabled={busy === m.id}
                                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  title="Remove"
                                >
                                  <X size={13} />
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-muted-foreground capitalize">{c.role}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {canManage && (
                <section className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Add teammates
                  </p>
                  {withoutCollab.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">No more teammates to add.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {withoutCollab.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/40 hover:bg-muted/20">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground truncate">{m.full_name || m.email}</p>
                            {m.email && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
                          </div>
                          <div className="flex items-center gap-1">
                            {ROLES.map((r) => (
                              <Button
                                key={r.value}
                                size="sm"
                                variant="outline"
                                disabled={busy === m.id}
                                onClick={() => invite(m.id, r.value)}
                                className={cn('h-7 px-2 gap-1 text-xs')}
                              >
                                {busy === m.id ? <Loader2 size={11} className="animate-spin" /> : <UserPlus size={11} />}
                                {r.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
