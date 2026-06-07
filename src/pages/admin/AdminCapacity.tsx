import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { format, addDays, startOfDay } from 'date-fns';

interface Profile { id: string; full_name: string; }
type Cell = Record<string, Record<string, { videos: number; writing: number; design: number; shoots: number }>>;

const DAYS = 14;

export default function AdminCapacity() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cells, setCells] = useState<Cell>({});
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    const start = startOfDay(new Date());
    return Array.from({ length: DAYS }, (_, i) => addDays(start, i));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = dateRange[0].toISOString().slice(0, 10);
      const end = dateRange[DAYS - 1].toISOString().slice(0, 10);

      const [{ data: profs }, { data: videos }, { data: writing }, { data: design }, { data: shoots }] = await Promise.all([
        supabase.from('profiles').select('id,full_name').eq('is_active', true).order('full_name'),
        supabase.from('videos').select('assigned_editor,due_date').gte('due_date', start).lte('due_date', end).not('status', 'in', '("live")'),
        supabase.from('writing_tasks').select('assigned_writer,due_date').gte('due_date', start).lte('due_date', end).not('status', 'eq', 'delivered'),
        supabase.from('design_tasks').select('assigned_designer,due_date').gte('due_date', start).lte('due_date', end).not('status', 'eq', 'delivered'),
        supabase.from('videos').select('assigned_camera_operator,shoot_date').gte('shoot_date', start).lte('shoot_date', end),
      ]);

      const c: Cell = {};
      const bump = (uid: string | null, date: string | null, key: 'videos' | 'writing' | 'design' | 'shoots') => {
        if (!uid || !date) return;
        c[uid] = c[uid] || {};
        c[uid][date] = c[uid][date] || { videos: 0, writing: 0, design: 0, shoots: 0 };
        c[uid][date][key] += 1;
      };
      videos?.forEach((v: any) => bump(v.assigned_editor, v.due_date, 'videos'));
      writing?.forEach((w: any) => bump(w.assigned_writer, w.due_date, 'writing'));
      design?.forEach((d: any) => bump(d.assigned_designer, d.due_date, 'design'));
      shoots?.forEach((s: any) => bump(s.assigned_camera_operator, s.shoot_date, 'shoots'));

      setProfiles((profs || []) as Profile[]);
      setCells(c);
      setLoading(false);
    })();
  }, [dateRange]);

  const intensity = (n: number) => {
    if (n === 0) return 'bg-muted/30';
    if (n <= 1) return 'bg-success/30';
    if (n <= 3) return 'bg-warning/40';
    if (n <= 5) return 'bg-orange-500/50';
    return 'bg-destructive/60';
  };

  const visibleProfiles = profiles.filter(p => cells[p.id] && Object.keys(cells[p.id]).length > 0);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Capacity Planner</h1>
          <p className="text-muted-foreground mt-1">Next 14 days of due tasks & scheduled shoots per team member</p>
        </div>

        <div className="flex gap-3 items-center text-xs text-muted-foreground">
          <span>Load:</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-muted/30 inline-block" /> none</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-success/30 inline-block" /> light</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-warning/40 inline-block" /> medium</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-orange-500/50 inline-block" /> heavy</span>
          <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-destructive/60 inline-block" /> overload</span>
        </div>

        {loading ? <p>Loading…</p> : (
          <Card className="p-4 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground p-2 sticky left-0 bg-background">Team member</th>
                  {dateRange.map(d => (
                    <th key={d.toISOString()} className="text-xs font-medium text-muted-foreground p-1 text-center">
                      <div>{format(d, 'EEE')}</div>
                      <div className="text-foreground">{format(d, 'd')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleProfiles.map(p => (
                  <tr key={p.id}>
                    <td className="p-2 text-sm font-medium sticky left-0 bg-background whitespace-nowrap">{p.full_name}</td>
                    {dateRange.map(d => {
                      const key = d.toISOString().slice(0, 10);
                      const cell = cells[p.id]?.[key] || { videos: 0, writing: 0, design: 0, shoots: 0 };
                      const total = cell.videos + cell.writing + cell.design + cell.shoots;
                      return (
                        <td key={key} className="p-1">
                          <div
                            className={`${intensity(total)} rounded h-10 flex items-center justify-center text-xs font-semibold cursor-default`}
                            title={`${total} items — videos:${cell.videos} writing:${cell.writing} design:${cell.design} shoots:${cell.shoots}`}
                          >
                            {total > 0 ? total : ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {visibleProfiles.length === 0 && (
                  <tr><td colSpan={DAYS + 1} className="text-center text-muted-foreground py-12">No scheduled work in this window.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
