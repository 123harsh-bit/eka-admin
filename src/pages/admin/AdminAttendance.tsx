import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { ATTENDANCE_STATUSES, ROLE_LABELS } from '@/lib/statusConfig';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Download, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMemberAttendance {
  user_id: string; full_name: string; role: string; avatar_url: string | null;
  login_time: string | null; logout_time: string | null;
  total_hours_worked: number | null; status: string | null;
  admin_note: string | null; attendance_id: string | null;
  is_online: boolean; last_seen: string | null;
}

export default function AdminAttendance() {
  const [tab, setTab] = useState<'today' | 'history'>('today');
  const [teamToday, setTeamToday] = useState<TeamMemberAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { fetchToday(); }, []);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab, dateRange]);

  const fetchToday = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    // Get team members (non-admin, non-client)
    const { data: roles } = await supabase.from('user_roles').select('user_id, role').not('role', 'in', '("admin","client")');
    if (!roles || roles.length === 0) { setTeamToday([]); setLoading(false); return; }
    
    const userIds = roles.map(r => r.user_id);
    const roleMap: Record<string, string> = {};
    roles.forEach(r => { roleMap[r.user_id] = r.role; });

    const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, is_online, last_seen').in('id', userIds);
    const { data: attendance } = await supabase.from('attendance_logs').select('*').eq('date', today).in('user_id', userIds);

    const attendanceMap: Record<string, any> = {};
    attendance?.forEach(a => { attendanceMap[a.user_id] = a; });

    const team: TeamMemberAttendance[] = (profiles || []).map(p => {
      const att = attendanceMap[p.id];
      return {
        user_id: p.id, full_name: p.full_name, role: roleMap[p.id] || 'editor',
        avatar_url: p.avatar_url,
        login_time: att?.login_time || null, logout_time: att?.logout_time || null,
        total_hours_worked: att?.total_hours_worked || null, status: att?.status || null,
        admin_note: att?.admin_note || null, attendance_id: att?.id || null,
        is_online: (p as any).is_online || false, last_seen: (p as any).last_seen || null,
      };
    });

    // Sort: absent at bottom
    team.sort((a, b) => {
      if (!a.login_time && b.login_time) return 1;
      if (a.login_time && !b.login_time) return -1;
      return 0;
    });

    setTeamToday(team);
    setLoading(false);
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('attendance_logs')
      .select('*, profiles(full_name)')
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)
      .order('date', { ascending: false });
    setHistoryData(data || []);
    setHistoryLoading(false);
  };

  const handleSaveNote = async (attendanceId: string) => {
    setSavingNote(true);
    await supabase.from('attendance_logs').update({ admin_note: noteText || null }).eq('id', attendanceId);
    setEditingNote(null);
    await fetchToday();
    setSavingNote(false);
  };

  const exportCSV = () => {
    const headers = ['Date', 'Name', 'Role', 'Login', 'Logout', 'Hours', 'Status', 'Note'];
    const rows = historyData.map((r: any) => [
      r.date, r.profiles?.full_name || '', '', 
      r.login_time ? new Date(r.login_time).toLocaleTimeString() : '',
      r.logout_time ? new Date(r.logout_time).toLocaleTimeString() : '',
      r.total_hours_worked || '', r.status || '', r.admin_note || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `attendance-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  const getStatusConfig = (status: string | null) => {
    if (!status) return ATTENDANCE_STATUSES.absent;
    return ATTENDANCE_STATUSES[status as keyof typeof ATTENDANCE_STATUSES] || ATTENDANCE_STATUSES.absent;
  };

  const onTimeCount = teamToday.filter(t => t.status === 'on_time').length;
  const lateCount = teamToday.filter(t => t.status === 'late').length;
  const absentCount = teamToday.filter(t => !t.login_time).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Attendance</h1>
            <p className="text-muted-foreground mt-1">Team attendance tracking</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('today')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>Today</button>
            <button onClick={() => setTab('history')} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-colors', tab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>History</button>
          </div>
        </div>

        {tab === 'today' && (
          <>
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <span className="text-foreground font-medium">
                Today {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} —
              </span>
              <span className="text-success">{onTimeCount} on time</span>
              <span className="text-warning">{lateCount} late</span>
              <span className="text-destructive">{absentCount} absent</span>
            </div>

            <div className="glass-card overflow-auto">
              {/* Desktop table */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-card/90 border-b border-glass-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Login</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Logout</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? [...Array(4)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
                  )) : teamToday.map(member => {
                    const cfg = getStatusConfig(member.login_time ? member.status : null);
                    const liveHours = member.login_time && !member.logout_time 
                      ? ((Date.now() - new Date(member.login_time).getTime()) / 3600000).toFixed(1) + 'h'
                      : null;
                    return (
                      <tr key={member.user_id} className={cn('border-b border-glass-border/50', !member.login_time && 'bg-destructive/5')}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-2 w-2 rounded-full', member.is_online ? 'bg-success' : 'bg-muted-foreground/30')} />
                            <span className="font-medium text-foreground">{member.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{ROLE_LABELS[member.role] || member.role}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.login_time ? (
                            <span className={member.status === 'late' ? 'text-warning' : 'text-success'}>
                              {new Date(member.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              {member.status === 'late' && ' ⚠️'}
                            </span>
                          ) : <span className="text-destructive">Not logged in</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {member.logout_time 
                            ? new Date(member.logout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                            : member.login_time ? <span className="text-success text-xs">Still working — {liveHours}</span> : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{member.total_hours_worked ? `${member.total_hours_worked}h` : liveHours || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.bgColor, cfg.color)}>
                            {cfg.emoji} {member.login_time ? cfg.label : 'Absent'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingNote === member.user_id ? (
                            <div className="flex gap-1">
                              <Input value={noteText} onChange={e => setNoteText(e.target.value)} className="h-7 text-xs w-32" placeholder="Note…" />
                              <Button size="sm" variant="ghost" onClick={() => member.attendance_id && handleSaveNote(member.attendance_id)} disabled={savingNote} className="h-7 px-2">
                                {savingNote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              </Button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingNote(member.user_id); setNoteText(member.admin_note || ''); }}
                              className="text-xs text-muted-foreground hover:text-foreground">
                              {member.admin_note ? <span className="italic">{member.admin_note}</span> : '+ Add note'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-glass-border/50">
                {loading ? [...Array(4)].map((_, i) => (
                  <div key={i} className="p-4"><div className="h-16 bg-muted/50 rounded-lg animate-pulse" /></div>
                )) : teamToday.map(member => {
                  const cfg = getStatusConfig(member.login_time ? member.status : null);
                  const liveHours = member.login_time && !member.logout_time 
                    ? ((Date.now() - new Date(member.login_time).getTime()) / 3600000).toFixed(1) + 'h'
                    : null;
                  return (
                    <div key={member.user_id} className={cn('p-4', !member.login_time && 'bg-destructive/5')}>
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {member.full_name.charAt(0)}
                          </div>
                          <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card', member.is_online ? 'bg-success' : 'bg-muted-foreground/30')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-foreground text-sm">{member.full_name}</p>
                            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', cfg.bgColor, cfg.color)}>
                              {cfg.emoji} {member.login_time ? cfg.label : 'Absent'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.role] || member.role}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>
                              In: {member.login_time ? (
                                <span className={member.status === 'late' ? 'text-warning' : 'text-success'}>
                                  {new Date(member.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : <span className="text-destructive">—</span>}
                            </span>
                            <span>
                              Out: {member.logout_time 
                                ? new Date(member.logout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : member.login_time ? <span className="text-success">Working</span> : '—'}
                            </span>
                            <span>{member.total_hours_worked ? `${member.total_hours_worked}h` : liveHours || '—'}</span>
                          </div>
                          {(member.admin_note || editingNote === member.user_id) && (
                            <div className="mt-2">
                              {editingNote === member.user_id ? (
                                <div className="flex gap-1">
                                  <Input value={noteText} onChange={e => setNoteText(e.target.value)} className="h-7 text-xs flex-1" placeholder="Note…" />
                                  <Button size="sm" variant="ghost" onClick={() => member.attendance_id && handleSaveNote(member.attendance_id)} disabled={savingNote} className="h-7 px-2">
                                    {savingNote ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                                  </Button>
                                </div>
                              ) : (
                                <button onClick={() => { setEditingNote(member.user_id); setNoteText(member.admin_note || ''); }}
                                  className="text-xs text-muted-foreground hover:text-foreground italic">
                                  {member.admin_note}
                                </button>
                              )}
                            </div>
                          )}
                          {!member.admin_note && editingNote !== member.user_id && (
                            <button onClick={() => { setEditingNote(member.user_id); setNoteText(''); }}
                              className="text-[11px] text-muted-foreground/60 hover:text-foreground mt-1">
                              + Add note
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'history' && (
          <>
            <div className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} className="w-40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} className="w-40" />
              </div>
              <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
                <Download size={14} /> Export CSV
              </Button>
            </div>

            <div className="glass-card overflow-auto">
              {/* Desktop table */}
              <table className="w-full text-sm hidden md:table">
                <thead className="bg-card/90 border-b border-glass-border">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Login</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Logout</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 bg-muted/50 rounded animate-pulse" /></td></tr>
                  )) : historyData.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No records for this period.</td></tr>
                  ) : historyData.map((r: any) => {
                    const cfg = getStatusConfig(r.status);
                    return (
                      <tr key={r.id} className="border-b border-glass-border/50">
                        <td className="px-4 py-3 text-foreground">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                        <td className="px-4 py-3 text-foreground">{r.profiles?.full_name || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.login_time ? new Date(r.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.total_hours_worked ? `${r.total_hours_worked}h` : '—'}</td>
                        <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-glass-border/50">
                {historyLoading ? [...Array(4)].map((_, i) => (
                  <div key={i} className="p-4"><div className="h-12 bg-muted/50 rounded-lg animate-pulse" /></div>
                )) : historyData.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">No records for this period.</div>
                ) : historyData.map((r: any) => {
                  const cfg = getStatusConfig(r.status);
                  return (
                    <div key={r.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground text-sm">{r.profiles?.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        </div>
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', cfg.bgColor, cfg.color)}>{cfg.emoji} {cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span>In: {r.login_time ? new Date(r.login_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        <span>Out: {r.logout_time ? new Date(r.logout_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                        <span>{r.total_hours_worked ? `${r.total_hours_worked}h` : '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
