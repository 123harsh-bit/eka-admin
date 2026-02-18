import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_client_id: string | null;
  related_video_id: string | null;
}

const TYPE_STYLES: Record<string, string> = {
  info: 'text-blue-400',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
  feedback: 'text-pink-400',
};

const TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '🚨',
  feedback: '💬',
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user?.id}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Notifications</h1>
            <p className="text-muted-foreground mt-1">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
              <CheckCheck size={16} /> Mark all read
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              )}
            >
              {f === 'all' ? 'All' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="glass-card h-16 animate-pulse" />)
          ) : displayed.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Bell size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
            </div>
          ) : (
            displayed.map(n => (
              <div
                key={n.id}
                className={cn(
                  'glass-card p-4 flex items-start gap-4 transition-all',
                  !n.is_read && 'border-primary/40 bg-primary/5'
                )}
              >
                <span className="text-xl flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', n.is_read ? 'text-foreground/80' : 'text-foreground font-medium')}>{n.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                {!n.is_read && (
                  <button onClick={() => markRead(n.id)} className="flex-shrink-0 p-1 hover:text-success transition-colors" title="Mark as read">
                    <Check size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
