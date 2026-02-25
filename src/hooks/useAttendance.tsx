import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const TEAM_ROLES = ['editor', 'designer', 'writer', 'camera_operator'];

export function useAttendance() {
  const { user, role } = useAuth();
  const pingRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user || !role || !TEAM_ROLES.includes(role)) return;

    // Ping every 5 minutes to keep last_seen updated
    const ping = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() } as any).eq('id', user.id).then(() => {});
    };
    ping(); // initial ping
    pingRef.current = setInterval(ping, 5 * 60 * 1000);

    // Cleanup: set offline
    const handleBeforeUnload = () => {
      supabase.from('profiles').update({ is_online: false } as any).eq('id', user.id).then(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (pingRef.current) clearInterval(pingRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase.from('profiles').update({ is_online: false } as any).eq('id', user.id).then(() => {});
    };
  }, [user?.id, role]);

  const recordLogout = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch today's record
    const { data } = await supabase
      .from('attendance_logs')
      .select('id, login_time, status')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    
    if (!data) return;
    
    const now = new Date();
    const loginTime = new Date(data.login_time);
    const hoursWorked = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
    
    let newStatus = data.status;
    if (hoursWorked < 4) {
      // keep existing status
    } else if (hoursWorked >= 4 && hoursWorked <= 6 && now.getHours() < 18) {
      newStatus = 'half_day';
    } else if (now.getHours() < 18 && hoursWorked < 8 && data.status === 'on_time') {
      newStatus = 'left_early';
    }

    await supabase.from('attendance_logs').update({
      logout_time: now.toISOString(),
      total_hours_worked: parseFloat(hoursWorked.toFixed(2)),
      status: newStatus,
    }).eq('id', data.id);

    await supabase.from('profiles').update({ is_online: false } as any).eq('id', user.id);
  };

  return { recordLogout };
}
