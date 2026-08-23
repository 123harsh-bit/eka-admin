import { useEffect, useRef, useState } from 'react';
import { Bot, X, Trash2, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from '@/components/ai-elements/tool';

interface Step { name: string; args: unknown; result: unknown; ok: boolean }
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  steps?: Step[];
  suggestions?: string[];
  failed?: boolean;
}

const TOOL_LABEL: Record<string, string> = {
  list_clients: 'Looking up clients',
  list_team: 'Looking up team',
  find_videos: 'Searching videos',
  pipeline_overview: 'Reading the pipeline',
  create_video: 'Creating video',
  update_video: 'Updating video',
  assign_person: 'Assigning team member',
};

export function AdminAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !loading) inputRef.current?.focus();
  }, [open, loading]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;
    const next: Msg[] = [...messages, { role: 'user', content: clean }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-assistant', {
        body: { messages: next.slice(-30).map(m => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      setMessages(m => [...m, {
        role: 'assistant',
        content: payload.reply || '(no response)',
        steps: payload.steps ?? [],
        suggestions: payload.suggestions ?? [],
      }]);
      if ((payload.actions ?? []).length) toast.success('Changes applied to the pipeline');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Assistant failed';
      setMessages(m => [...m, { role: 'assistant', content: msg, failed: true }]);
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
          aria-label="Open production assistant"
        >
          <Bot size={24} />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-16 top-16 md:inset-auto md:bottom-6 md:right-6 md:w-[440px] md:h-[640px] z-50 flex flex-col glass-card border border-primary/30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-card/70">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Production Assistant</p>
                <p className="text-[11px] text-muted-foreground">Create, assign and update by chatting</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors" aria-label="Clear chat">
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <Conversation className="flex-1">
            <ConversationContent className="p-3 gap-3">
              {messages.length === 0 && !loading && (
                <ConversationEmptyState
                  icon={<Bot size={22} className="text-primary" />}
                  title="Tell me what to change"
                  description="Plain language, typos welcome — I'll match the client, video and people myself."
                />
              )}

              {messages.map((m, i) => (
                <div key={i} className="space-y-2">
                  {!!m.steps?.length && (
                    <div className="space-y-1.5">
                      {m.steps.map((s, j) => (
                        <Tool key={j} defaultOpen={false}>
                          <ToolHeader
                            type={`tool-${TOOL_LABEL[s.name] ?? s.name}` as `tool-${string}`}
                            state={s.ok ? 'output-available' : 'output-error'}
                          />
                          <ToolContent>
                            <ToolInput input={s.args} />
                            <ToolOutput
                              output={s.ok ? <pre className="overflow-x-auto text-xs">{JSON.stringify(s.result, null, 2)}</pre> : undefined}
                              errorText={s.ok ? undefined : String((s.result as any)?.error ?? 'Failed')}
                            />
                          </ToolContent>
                        </Tool>
                      ))}
                    </div>
                  )}

                  <Message from={m.role === 'user' ? 'user' : 'assistant'}>
                    <MessageContent>
                      {m.role === 'user' ? (
                        <span className="text-sm">{m.content}</span>
                      ) : m.failed ? (
                        <span className="flex items-start gap-2 text-sm text-destructive">
                          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                          {m.content}
                        </span>
                      ) : (
                        <MessageResponse>{m.content}</MessageResponse>
                      )}
                    </MessageContent>
                  </Message>

                  {m.role === 'assistant' && !!m.suggestions?.length && i === messages.length - 1 && !loading && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {m.suggestions.map(s => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-primary/15 transition-colors"
                        >
                          {s}
                          <ArrowRight size={11} className="text-primary" />
                        </button>
                      ))}
                    </div>
                  )}

                  {m.role === 'assistant' && !m.failed && !!m.steps?.some(s => ['create_video', 'update_video', 'assign_person'].includes(s.name) && s.ok) && (
                    <p className="flex items-center gap-1.5 pl-1 text-[11px] text-success">
                      <CheckCircle2 size={12} /> Pipeline updated
                    </p>
                  )}
                </div>
              ))}

              {loading && <Shimmer className="text-sm">Working on it…</Shimmer>}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="border-t border-glass-border p-2 bg-card/60">
            <PromptInput
              onSubmit={(message) => { send(message.text || input); }}
            >
              <PromptInputTextarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="e.g. assign editor kiran to divyas recent reel and mark script approved"
                className="text-sm"
              />
              <PromptInputFooter className="justify-end">
                <PromptInputSubmit status={loading ? 'submitted' : undefined} disabled={loading || !input.trim()} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </>
  );
}
