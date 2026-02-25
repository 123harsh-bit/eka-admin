import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Coffee, LogOut, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AttendanceState {
  id: string;
  login_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  lunch_duration_minutes: number | null;
  current_state: string;
  logout_time: string | null;
  status: string | null;
}

const TEAM_ROLES = ['editor', 'designer', 'writer', 'camera_operator'];

export function AttendanceBar() {
  const { user, role, signOut } = useAuth();
  const { toast } = useToast();
  const [att, setAtt] = useState<AttendanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [elapsed, setElapsed] = useState('');
  const [lunchElapsed, setLunchElapsed] = useState('');
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user || !role || !TEAM_ROLES.includes(role)) { setLoading(false); return; }
    fetchAttendance();
  }, [user?.id, role]);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      if (att?.login_time && !att.logout_time) {
        const diff = Date.now() - new Date(att.login_time).getTime();
        const lunchMs = att.lunch_duration_minutes ? att.lunch_duration_minutes * 60000 : 0;
        const ongoingLunchMs = att.current_state === 'on_lunch' && att.lunch_start
          ? Date.now() - new Date(att.lunch_start).getTime() : 0;
        const workMs = diff - lunchMs - ongoingLunchMs;
        const h = Math.floor(workMs / 3600000);
        const m = Math.floor((workMs % 3600000) / 60000);
        setElapsed(`${h}h ${m}m`);
      }
      if (att?.current_state === 'on_lunch' && att.lunch_start) {
        const diff = Date.now() - new Date(att.lunch_start).getTime();
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setLunchElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [att]);

  const fetchAttendance = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance_logs')
      .select('id, login_time, lunch_start, lunch_end, lunch_duration_minutes, current_state, logout_time, status')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();
    if (data) setAtt(data as AttendanceState);
    setLoading(false);
  };

  const handleStartLunch = async () => {
    if (!att) return;
    setActing(true);
    const now = new Date().toISOString();
    await supabase.from('attendance_logs').update({
      lunch_start: now,
      current_state: 'on_lunch',
    }).eq('id', att.id);
    setAtt(a => a ? { ...a, lunch_start: now, current_state: 'on_lunch' } : a);
    setActing(false);
  };

  const handleResumeLunch = async () => {
    if (!att || !att.lunch_start) return;
    setActing(true);
    const now = new Date();
    const durationMin = (now.getTime() - new Date(att.lunch_start).getTime()) / 60000;
    const totalLunch = (att.lunch_duration_minutes || 0) + durationMin;

    await supabase.from('attendance_logs').update({
      lunch_end: now.toISOString(),
      lunch_duration_minutes: parseFloat(totalLunch.toFixed(2)),
      current_state: 'working',
    }).eq('id', att.id);

    if (durationMin < 30) {
      toast({ title: '⚠️ Short lunch break', description: 'Your lunch break was under 30 minutes. A minimum 30-minute break is recommended.' });
    }

    setAtt(a => a ? { ...a, lunch_end: now.toISOString(), lunch_duration_minutes: parseFloat(totalLunch.toFixed(2)), current_state: 'working' } : a);
    setActing(false);
  };

  const handleEndWorkday = async () => {
    if (!att) return;
    setActing(true);
    const now = new Date();
    const loginTime = new Date(att.login_time);
    const totalMs = now.getTime() - loginTime.getTime();
    const lunchMs = (att.lunch_duration_minutes || 0) * 60000;
    const workMs = totalMs - lunchMs;
    const hoursWorked = workMs / 3600000;

    const lunchSkipped = !att.lunch_start && !att.lunch_end;
    const minuteOfDay = new Date(att.login_time).getHours() * 60 + new Date(att.login_time).getMinutes();
    const wasLate = minuteOfDay > 555;

    let newStatus = att.status || 'on_time';
    if (wasLate) {
      newStatus = 'late';
    } else if (hoursWorked < 6) {
      newStatus = 'left_early';
    } else if (hoursWorked >= 6 && hoursWorked < 8) {
      newStatus = 'half_day';
    } else {
      newStatus = 'on_time';
    }

    await supabase.from('attendance_logs').update({
      logout_time: now.toISOString(),
      total_hours_worked: parseFloat(hoursWorked.toFixed(2)),
      current_state: 'logged_out',
      status: newStatus,
      lunch_skipped: lunchSkipped,
    }).eq('id', att.id);

    await supabase.from('profiles').update({
      is_online: false,
    } as any).eq('id', user!.id);

    setActing(false);
    setShowEndConfirm(false);
    signOut();
  };

  if (loading || !att || !user || !role || !TEAM_ROLES.includes(role)) return null;
  if (att.logout_time || att.current_state === 'logged_out') return null;

  const loginTimeStr = new Date(att.login_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const isOnLunch = att.current_state === 'on_lunch';
  const lunchOver60 = isOnLunch && att.lunch_start && (Date.now() - new Date(att.lunch_start).getTime()) > 3600000;

  // End workday summary
  const getSummary = () => {
    const now = new Date();
    const loginTime = new Date(att.login_time);
    const totalMs = now.getTime() - loginTime.getTime();
    const lunchMs = (att.lunch_duration_minutes || 0) * 60000;
    const workMs = totalMs - lunchMs;
    const h = Math.floor(workMs / 3600000);
    const m = Math.floor((workMs % 3600000) / 60000);
    return { workTime: `${h}h ${m}min`, loginTimeStr };
  };

  return (
    <>
      <div className={cn(
        'w-full px-4 py-2 flex items-center justify-between text-xs border-b gap-3 flex-wrap',
        isOnLunch ? 'bg-amber-500/10 border-amber-500/20' : 'bg-success/5 border-success/10'
      )}>
        {isOnLunch ? (
          <div className="flex items-center gap-2">
            <Coffee size={14} className="text-amber-400" />
            <span className="text-amber-400 font-medium">Lunch Break — Started {att.lunch_start && new Date(att.lunch_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            {lunchOver60 && (
              <span className="text-amber-500 font-bold animate-pulse">⏰ 1 hour lunch complete — time to get back to work!</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-success font-medium">Working</span>
            <span className="text-muted-foreground">— Started {loginTimeStr}</span>
            <span className="text-muted-foreground">· {elapsed}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {isOnLunch ? (
            <Button size="sm" variant="outline" onClick={handleResumeLunch} disabled={acting} className="h-7 gap-1.5 text-xs">
              {acting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              ▶️ Resume Work ({lunchElapsed})
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStartLunch} disabled={acting || !!att.lunch_end} className="h-7 gap-1.5 text-xs">
              <Coffee size={12} /> ☕ Start Lunch Break
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowEndConfirm(true)} className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut size={12} /> 🔴 End Workday
          </Button>
        </div>
      </div>

      {/* End Workday Confirmation Dialog */}
      {showEndConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60]" onClick={() => setShowEndConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-sm">
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-lg font-display font-bold text-foreground">End Your Workday?</h3>
              <div className="space-y-2 text-sm">
                <p className="text-foreground font-semibold">Today's Summary:</p>
                <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-xs">
                  <p>⏰ Started: {loginTimeStr}</p>
                  {att.lunch_start && att.lunch_end && (
                    <p>☕ Lunch: {new Date(att.lunch_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {new Date(att.lunch_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ({Math.round(att.lunch_duration_minutes || 0)} min)</p>
                  )}
                  {!att.lunch_start && <p className="text-amber-400">⚠️ No lunch break taken</p>}
                  <p>🕐 Total work time: {getSummary().workTime}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowEndConfirm(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleEndWorkday} disabled={acting} className="flex-1 bg-destructive hover:bg-destructive/90 gap-2">
                  {acting && <Loader2 size={14} className="animate-spin" />}
                  Confirm End Workday & Log Out
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
