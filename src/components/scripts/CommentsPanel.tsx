import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, MessageSquare, Reply, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ScriptComment {
  id: string;
  script_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  resolved: boolean;
  created_at: string;
  anchor: unknown;
}

interface Props {
  scriptId: string;
  onResolve: (commentId: string) => void;
  onFocus: (commentId: string) => void;
  onClose?: () => void;
}

export function CommentsPanel({ scriptId, onResolve, onFocus, onClose }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ScriptComment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { name: string }>>({});
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');

  const fetchAll = async () => {
    const { data } = await supabase
      .from('script_comments')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: true });
    const rows = (data || []) as ScriptComment[];
    setComments(rows);
    const ids = Array.from(new Set(rows.map((r) => r.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
      const map: Record<string, { name: string }> = {};
      (profs || []).forEach((p) => {
        map[p.id] = { name: (p as { full_name: string }).full_name || 'Team member' };
      });
      setProfiles(map);
    }
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel(`script-comments:${scriptId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'script_comments', filter: `script_id=eq.${scriptId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]);

  const roots = comments.filter((c) => !c.parent_id);
  const visible = roots.filter((r) =>
    filter === 'all' ? true : filter === 'resolved' ? r.resolved : !r.resolved
  );

  const submitReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return;
    await supabase.from('script_comments').insert({
      script_id: scriptId,
      author_id: user.id,
      parent_id: parentId,
      body: replyText.trim(),
    });
    setReplyText('');
    setReplyTo(null);
  };

  const deleteComment = async (id: string) => {
    if (!confirm('Delete this comment?')) return;
    await supabase.from('script_comments').delete().eq('id', id);
  };

  return (
    <div className="w-full h-full flex flex-col bg-card border-l border-border">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          <h3 className="font-display font-semibold">Comments</h3>
        </div>
        {onClose && (
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close comments"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="px-4 py-2 flex gap-1 border-b border-border">
        {(['open', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'text-xs px-2 py-1 rounded-md capitalize',
              filter === f
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {visible.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No {filter === 'all' ? '' : filter} comments yet.
          </p>
        )}
        {visible.map((c) => {
          const replies = comments.filter((r) => r.parent_id === c.id);
          return (
            <div
              key={c.id}
              className={cn(
                'rounded-lg border p-3 space-y-2 text-sm',
                c.resolved ? 'border-border/40 opacity-60' : 'border-border bg-background/40'
              )}
            >
              <button
                onClick={() => onFocus(c.id)}
                className="w-full text-left space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{profiles[c.author_id]?.name || 'Team member'}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-foreground">{c.body}</p>
              </button>
              {replies.map((r) => (
                <div key={r.id} className="pl-3 border-l-2 border-primary/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">
                      {profiles[r.author_id]?.name || 'Team member'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs whitespace-pre-wrap">{r.body}</p>
                  {(user?.id === r.author_id) && (
                    <button
                      onClick={() => deleteComment(r.id)}
                      className="text-[10px] text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
              {!c.resolved && (
                <>
                  {replyTo === c.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        placeholder="Reply…"
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => submitReply(c.id)} className="h-7 text-xs">
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setReplyTo(null); setReplyText(''); }}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        onClick={() => setReplyTo(c.id)}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Reply size={12} /> Reply
                      </button>
                      <button
                        onClick={() => onResolve(c.id)}
                        className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
                      >
                        <CheckCircle2 size={12} /> Resolve
                      </button>
                      {user?.id === c.author_id && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-destructive hover:text-destructive/80 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
