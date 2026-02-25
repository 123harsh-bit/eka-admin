import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_LABELS } from '@/lib/statusConfig';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TEAM_ROLES = ['editor', 'designer', 'writer', 'camera_operator'];

interface StartWorkdayProps {
  children: React.ReactNode;
}

export function StartWorkday({ children }: StartWorkdayProps) {
  const { user, role, profile } = useAuth();
  const [checked, setChecked] = useState(false);
  const [alreadyStarted, setAlreadyStarted] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!user || !role || !TEAM_ROLES.includes(role)) {
      setChecked(true);
      setAlreadyStarted(true);
      return;
    }
    checkExistingAttendance();
  }, [user?.id, role]);

  const checkExistingAttendance = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', today)
      .limit(1);
    
    if (data && data.length > 0) {
      setAlreadyStarted(true);
      // Still update online status
      await supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() }).eq('id', user.id);
    }
    setChecked(true);
  };

  const handleStart = async () => {
    if (!user) return;
    setStarting(true);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    const status = minuteOfDay > 555 ? 'late' : 'on_time';

    await supabase.from('attendance_logs').upsert(
      { user_id: user.id, date: today, login_time: now.toISOString(), status },
      { onConflict: 'user_id,date', ignoreDuplicates: true }
    );

    await supabase.from('profiles').update({ 
      is_online: true, 
      last_seen: now.toISOString() 
    }).eq('id', user.id);

    setAlreadyStarted(true);
    setStarting(false);
  };

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (alreadyStarted) {
    return <>{children}</>;
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex min-h-screen items-center justify-center animated-gradient">
      <div className="w-full max-w-sm mx-4 fade-in">
        <div className="glass-card p-8 space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-foreground">
              {greeting}, {profile?.full_name?.split(' ')[0] || 'there'} 👋
            </h1>
            {role && (
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                {ROLE_LABELS[role] || role}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-lg font-semibold text-foreground">
              {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-2xl font-display font-bold text-primary">
              {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>

          <Button
            onClick={handleStart}
            disabled={starting}
            size="lg"
            className="w-full gap-2 h-14 text-lg"
          >
            {starting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle className="h-5 w-5" />
            )}
            Start My Workday ✓
          </Button>

          <p className="text-xs text-muted-foreground">
            This records your attendance for today
          </p>
        </div>
      </div>
    </div>
  );
}
