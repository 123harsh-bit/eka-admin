import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ATTENDANCE_STATUSES } from '@/lib/statusConfig';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttendanceRow {
  id: string; date: string; login_time: string; logout_time: string | null;
  total_hours_worked: number | null; status: string | null;
}

export default function MyAttendancePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, avgHours: 0 });

  useEffect(() => {
    if (!user) return;
    fetchAttendance();
  }, [user]);

  const fetchAttendance = async () => {
    if (!user) return;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { data } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false });
    
    if (data) {
      setLogs(data);
      const present = data.filter(d => ['on_time', 'late', 'left_early', 'half_day'].includes(d.status || '')).length;
      const late = data.filter(d => d.status === 'late').length;
      const totalHours = data.reduce((sum, d) => sum + (d.total_hours_worked || 0), 0);
      setStats({
        present,
        late,
        absent: 0, // We don't track absent in logs — days missing from logs
        avgHours: present > 0 ? parseFloat((totalHours / present).toFixed(1)) : 0,
      });
    }
    setLoading(false);
  };

  const getStatusConfig = (status: string | null) => {
    if (!status) return ATTENDANCE_STATUSES.absent;
    return ATTENDANCE_STATUSES[status as keyof typeof ATTENDANCE_STATUSES] || ATTENDANCE_STATUSES.absent;
  };

  // Calendar heatmap for current month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const logsByDate: Record<string, AttendanceRow> = {};
  logs.forEach(l => { logsByDate[l.date] = l; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold gradient-text">My Attendance</h1>
        <p className="text-muted-foreground mt-1">Your attendance over the last 30 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Days Present', value: stats.present, color: 'text-success' },
          { label: 'Days Late', value: stats.late, color: 'text-warning' },
          { label: 'Avg Hours/Day', value: `${stats.avgHours}h`, color: 'text-primary' },
          { label: 'Total Days Logged', value: logs.length, color: 'text-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn('text-2xl font-display font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      <div className="glass-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Calendar size={14} /> {now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logsByDate[dateStr];
            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
            const isFuture = day > now.getDate();
            
            let bgColor = 'bg-muted/30'; // no data / weekend
            if (!isFuture && !isWeekend) {
              if (log?.status === 'on_time') bgColor = 'bg-success/60';
              else if (log?.status === 'late') bgColor = 'bg-warning/60';
              else if (log?.status === 'left_early') bgColor = 'bg-orange-500/60';
              else if (log?.status === 'half_day') bgColor = 'bg-blue-500/60';
              else if (!log && !isFuture) bgColor = 'bg-destructive/40';
            }

            return (
              <div key={day} className={cn('h-8 w-8 rounded flex items-center justify-center text-xs font-medium', bgColor, isFuture && 'opacity-30')}
                title={log ? `${dateStr}: ${log.status}` : dateStr}>
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/60" /> On Time</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-warning/60" /> Late</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/40" /> Absent</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted/30" /> Weekend</span>
        </div>
      </div>

      {/* Log table */}
      <div className="glass-card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-card/90 border-b border-glass-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Login</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Logout</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Hours</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => (
              <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-6 bg-muted/50 rounded animate-pulse" /></td></tr>
            )) : logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                <Clock size={24} className="mx-auto mb-2 opacity-40" /> No attendance records yet.
              </td></tr>
            ) : logs.map(log => {
              const cfg = getStatusConfig(log.status);
              return (
                <tr key={log.id} className="border-b border-glass-border/50">
                  <td className="px-4 py-3 text-foreground">{new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(log.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.logout_time ? new Date(log.logout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Still working'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{log.total_hours_worked ? `${log.total_hours_worked}h` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.bgColor, cfg.color)}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
