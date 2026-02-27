import { useEffect, useState } from 'react';
import { CameraLayout } from '@/components/camera/CameraLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function CameraNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, message, is_read, created_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setItems(data);
    };

    fetchNotifications();
    const channel = supabase
      .channel(`camera-notifications-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` }, fetchNotifications)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return (
    <CameraLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Notifications</h1>
          <p className="text-muted-foreground mt-1">Latest assignment and workflow updates</p>
        </div>

        <div className="glass-card overflow-hidden">
          {items.length === 0 ? (
            <div className="p-16 text-center">
              <Bell size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <div>
              {items.map(item => (
                <div key={item.id} className={cn('px-4 py-3 border-b border-glass-border/50', !item.is_read && 'bg-primary/5')}>
                  <p className="text-sm text-foreground">{item.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CameraLayout>
  );
}
