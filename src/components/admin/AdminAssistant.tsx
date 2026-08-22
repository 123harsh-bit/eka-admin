import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, X, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Create a video "Diabetes Reel" for Ankura Hospital and assign the writer Ravi',
  'Mark the Insulin video as approved',
  'Assign a camera operator to the RSV Vaccine shoot on Friday',
  'Which videos are waiting for my approval?',
];

export function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: { messages: next.slice(-30) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setMessages(m => [...m, { role: 'assistant', content: (data as any).reply || '(no response)' }]);
      if (((data as any).actions || []).length) {
        toast.success('Changes applied — refresh the list to see them.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Assistant failed';
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Open AI assistant"
        >
          <Bot size={24} />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-16 top-16 md:inset-auto md:bottom-6 md:right-6 md:w-[420px] md:h-[620px] z-50 flex flex-col glass-card border border-primary/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-card/70">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center"><Bot size={16} /></span>
              <div>
                <p className="text-sm font-semibold text-foreground">Production Assistant</p>
                <p className="text-[11px] text-muted-foreground">Create, assign and update by chatting</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" aria-label="Clear chat"><Trash2 size={15} /></button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close"><X size={16} /></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try one of these:</p>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-xs p-2.5 rounded-md border border-border/60 hover:border-primary/60 hover:bg-primary/5 text-foreground transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-2'
                    : 'text-foreground'
                )}>
                  {m.role === 'user' ? m.content : (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Working on it…
              </div>
            )}
          </div>

          <div className="border-t border-glass-border p-2 flex items-end gap-2 bg-card/60">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
              }}
              rows={1}
              placeholder="e.g. Assign editor Sai to the Insulin video"
              className="min-h-[40px] max-h-32 resize-none text-sm"
            />
            <Button size="icon" onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
