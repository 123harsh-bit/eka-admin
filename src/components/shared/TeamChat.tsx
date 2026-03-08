import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  channel: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export function TeamChat() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    fetchUnreadCount();

    const channel = supabase
      .channel('team-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages' }, (payload) => {
        const msg = payload.new as Message;
        loadSenderName(msg).then(named => {
          setMessages(prev => [...prev, named]);
        });
        if (msg.sender_id !== user.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) {
      markAsRead();
      setUnreadCount(0);
    }
  }, [open]);

  const loadSenderName = async (msg: Message) => {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', msg.sender_id).single();
    return { ...msg, sender_name: data?.full_name || 'Unknown' };
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('team_messages')
      .select('*')
      .eq('channel', 'general')
      .is('recipient_id', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (data) {
      const senderIds = [...new Set(data.map(m => m.sender_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', senderIds);
      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.id] = p.full_name; });
      setMessages(data.map(m => ({ ...m, sender_name: nameMap[m.sender_id] || 'Unknown' })));
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('team_messages')
      .select('*', { count: 'exact', head: true })
      .eq('channel', 'general')
      .is('recipient_id', null)
      .eq('is_read', false)
      .neq('sender_id', user.id);
    setUnreadCount(count || 0);
  };

  const markAsRead = async () => {
    if (!user) return;
    await supabase
      .from('team_messages')
      .update({ is_read: true })
      .eq('channel', 'general')
      .is('recipient_id', null)
      .eq('is_read', false)
      .neq('sender_id', user.id);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    await supabase.from('team_messages').insert({
      sender_id: user.id,
      channel: 'general',
      content: newMessage.trim(),
    });
    setNewMessage('');
    setSending(false);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[28rem] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h3 className="font-display font-semibold text-sm text-foreground">Team Chat</h3>
            <span className="text-xs text-muted-foreground ml-auto">General</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center mt-8">No messages yet. Say hello! 👋</p>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={cn('flex flex-col', isMe ? 'items-end' : 'items-start')}>
                  <span className="text-[10px] text-muted-foreground mb-0.5 px-1">{msg.sender_name}</span>
                  <div className={cn(
                    'max-w-[80%] px-3 py-2 rounded-2xl text-sm',
                    isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'
                  )}>
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="text-sm"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send size={16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
