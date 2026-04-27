import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, Send, Trash2, Reply } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type Comment = {
  id: string;
  video_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author?: { full_name: string; avatar_url: string | null };
};

export function VideoComments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('video_comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: true });
    if (!data) return;
    const authorIds = [...new Set(data.map(c => c.author_id))];
    const { data: authors } = await supabase
      .from('profiles').select('id, full_name, avatar_url').in('id', authorIds);
    const map = new Map(authors?.map(a => [a.id, a]) || []);
    setComments(data.map(c => ({ ...c, author: map.get(c.author_id) as Comment['author'] })));
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`video_comments:${videoId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'video_comments', filter: `video_id=eq.${videoId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [videoId]);

  const submit = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    const { error } = await supabase.from('video_comments').insert({
      video_id: videoId, author_id: user.id, content: content.trim(),
      parent_id: replyTo,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setContent(''); setReplyTo(null);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('video_comments').delete().eq('id', id);
    if (error) toast.error(error.message);
  };

  const roots = comments.filter(c => !c.parent_id);
  const childrenOf = (id: string) => comments.filter(c => c.parent_id === id);

  const renderComment = (c: Comment, depth = 0) => (
    <div key={c.id} className={cn('group', depth > 0 && 'ml-6 pl-4 border-l border-border')}>
      <div className="flex gap-2.5 py-2">
        <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary flex-shrink-0">
          {c.author?.full_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-foreground">{c.author?.full_name || 'Unknown'}</span>
            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
          </div>
          <p className="text-xs text-foreground/90 mt-0.5 whitespace-pre-wrap">{c.content}</p>
          <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => setReplyTo(c.id)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
              <Reply size={10} /> Reply
            </button>
            {c.author_id === user?.id && (
              <button onClick={() => remove(c.id)} className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1">
                <Trash2 size={10} /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
      {childrenOf(c.id).map(child => renderComment(child, depth + 1))}
    </div>
  );

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} className="text-primary" />
        <h3 className="text-sm font-semibold">Discussion</h3>
        <span className="text-[10px] text-muted-foreground">({comments.length})</span>
      </div>

      <div className="space-y-1 max-h-96 overflow-y-auto -mx-1 px-1 mb-3">
        {roots.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No comments yet. Start the discussion.</p>
        )}
        {roots.map(c => renderComment(c))}
      </div>

      {replyTo && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 px-1">
          <span>Replying to comment</span>
          <button onClick={() => setReplyTo(null)} className="hover:text-destructive">Cancel</button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Add a comment… (⌘+Enter to send)"
          className="min-h-[60px] text-xs resize-none"
        />
        <Button onClick={submit} disabled={loading || !content.trim()} size="icon" className="h-auto">
          <Send size={14} />
        </Button>
      </div>
    </div>
  );
}
