import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NewScriptModal } from '@/components/scripts/NewScriptModal';
import {
  FileText, Plus, Search, Trash2, Archive, Link2, Users, Clock, Loader2, ArchiveRestore,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ScriptRow {
  id: string;
  title: string;
  client_id: string | null;
  linked_writing_task_id: string | null;
  created_by: string;
  updated_by: string | null;
  word_count: number;
  archived: boolean;
  updated_at: string;
  created_at: string;
}

interface Props {
  routeBase: '/writer/scripts' | '/admin/scripts';
}

export default function ScriptsLibrary({ routeBase }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<ScriptRow[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [tasks, setTasks] = useState<Record<string, string>>({});
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('scripts')
      .select('*')
      .order('updated_at', { ascending: false });
    const rows = (data || []) as ScriptRow[];
    setScripts(rows);

    const clientIds = Array.from(new Set(rows.map((r) => r.client_id).filter(Boolean))) as string[];
    const taskIds = Array.from(new Set(rows.map((r) => r.linked_writing_task_id).filter(Boolean))) as string[];
    const userIds = Array.from(new Set([...rows.map((r) => r.created_by), ...rows.map((r) => r.updated_by)].filter(Boolean))) as string[];

    if (clientIds.length) {
      const { data: cs } = await supabase.from('clients').select('id, name').in('id', clientIds);
      setClients(Object.fromEntries((cs || []).map((c) => [c.id, c.name])));
    }
    if (taskIds.length) {
      const { data: ts } = await supabase.from('writing_tasks').select('id, title').in('id', taskIds);
      setTasks(Object.fromEntries((ts || []).map((t) => [t.id, t.title])));
    }
    if (userIds.length) {
      const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      setAuthors(Object.fromEntries((ps || []).map((p) => [p.id, (p as { full_name: string }).full_name || 'Team member'])));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const ch = supabase
      .channel('scripts-lib')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientOptions = useMemo(() => {
    const set = new Set(scripts.map((s) => s.client_id).filter(Boolean) as string[]);
    return Array.from(set).map((id) => ({ id, name: clients[id] || id }));
  }, [scripts, clients]);

  const visible = scripts.filter((s) => {
    if (!showArchived && s.archived) return false;
    if (showArchived && !s.archived) return false;
    if (clientFilter && s.client_id !== clientFilter) return false;
    if (q && !s.title.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const toggleArchive = async (s: ScriptRow) => {
    await supabase.from('scripts').update({ archived: !s.archived }).eq('id', s.id);
    toast({ title: s.archived ? 'Restored' : 'Archived' });
  };

  const remove = async (s: ScriptRow) => {
    if (!confirm(`Delete "${s.title}" permanently? This cannot be undone.`)) return;
    const { error } = await supabase.from('scripts').delete().eq('id', s.id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Script deleted' });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Scripts</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Write, share and collaborate on scripts — right inside the workspace.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus size={16} /> New Script
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title…"
            className="pl-9"
          />
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm md:w-56"
        >
          <option value="">All clients</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived((v) => !v)}
          className="gap-2"
        >
          <Archive size={14} /> {showArchived ? 'Archived' : 'Active'}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <FileText size={40} className="mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground">No scripts yet.</p>
          <Button onClick={() => setModalOpen(true)} className="gap-2 mx-auto">
            <Plus size={16} /> Create your first script
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((s) => (
            <div
              key={s.id}
              className={cn(
                'glass-card p-5 space-y-3 hover:border-primary/50 transition-colors cursor-pointer group',
                s.archived && 'opacity-60'
              )}
              onClick={() => navigate(`${routeBase}/${s.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <FileText className="text-primary shrink-0" size={20} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleArchive(s); }}
                    className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    title={s.archived ? 'Restore' : 'Archive'}
                  >
                    {s.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                  </button>
                  {(user?.id === s.created_by) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(s); }}
                      className="h-7 w-7 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">{s.title}</h3>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {s.client_id && clients[s.client_id] && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    <Users size={10} /> {clients[s.client_id]}
                  </span>
                )}
                {s.linked_writing_task_id && tasks[s.linked_writing_task_id] && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1 max-w-full">
                    <Link2 size={10} />
                    <span className="truncate">{tasks[s.linked_writing_task_id]}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border">
                <span className="truncate">
                  {authors[s.updated_by || s.created_by] || 'Team member'}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">{s.word_count} words</div>
            </div>
          ))}
        </div>
      )}

      <NewScriptModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(id) => navigate(`${routeBase}/${id}`)}
      />
    </div>
  );
}
