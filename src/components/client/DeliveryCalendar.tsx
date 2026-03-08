import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Video, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CalendarVideo {
  id: string;
  title: string;
  status: string;
  date_planned: string | null;
  date_delivered: string | null;
  shoot_date: string | null;
}

interface DeliveryCalendarProps {
  videos: CalendarVideo[];
}

export function DeliveryCalendar({ videos }: DeliveryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDate = useMemo(() => {
    const map: Record<string, Array<{ title: string; type: 'delivery' | 'shoot' | 'delivered'; status: string }>> = {};
    videos.forEach(v => {
      const addEvent = (dateStr: string | null, type: 'delivery' | 'shoot' | 'delivered') => {
        if (!dateStr) return;
        const d = dateStr.slice(0, 10);
        if (!map[d]) map[d] = [];
        map[d].push({ title: v.title, type, status: v.status });
      };
      if (v.date_planned && !['live', 'approved'].includes(v.status)) addEvent(v.date_planned, 'delivery');
      if (v.date_delivered) addEvent(v.date_delivered, 'delivered');
      if (v.shoot_date && !['live', 'approved', 'ready_to_upload'].includes(v.status)) addEvent(v.shoot_date, 'shoot');
    });
    return map;
  }, [videos]);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-foreground">Delivery Calendar</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary" /> Planned</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-accent-foreground" /> Shoot</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Delivered</span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const events = eventsByDate[dateStr] || [];
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

          return (
            <div
              key={day}
              className={cn(
                'relative min-h-[40px] sm:min-h-[56px] p-0.5 rounded-md text-xs transition-colors',
                isToday && 'bg-primary/10 ring-1 ring-primary/30',
                events.length > 0 && 'bg-muted/30'
              )}
            >
              <span className={cn(
                'block text-center text-[11px]',
                isToday ? 'font-bold text-primary' : 'text-foreground/70'
              )}>{day}</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5 justify-center">
                {events.slice(0, 2).map((ev, j) => (
                  <span
                    key={j}
                    title={ev.title}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      ev.type === 'delivery' && 'bg-primary',
                      ev.type === 'shoot' && 'bg-accent-foreground',
                      ev.type === 'delivered' && 'bg-green-500'
                    )}
                  />
                ))}
                {events.length > 2 && (
                  <span className="text-[8px] text-muted-foreground">+{events.length - 2}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming events list */}
      {(() => {
        const todayStr = today.toISOString().slice(0, 10);
        const upcoming = Object.entries(eventsByDate)
          .filter(([date]) => date >= todayStr)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(0, 5);

        if (upcoming.length === 0) return null;
        return (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground">Upcoming</p>
            {upcoming.map(([date, events]) => (
              <div key={date} className="flex items-start gap-2">
                <span className="text-[10px] text-muted-foreground min-w-[60px]">
                  {new Date(date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <div className="space-y-0.5">
                  {events.map((ev, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {ev.type === 'shoot' ? <Camera size={10} className="text-accent-foreground" /> : <Video size={10} className="text-primary" />}
                      <span className="text-foreground/80 truncate max-w-[200px]">{ev.title}</span>
                      <span className={cn(
                        'text-[9px] px-1.5 py-0 rounded-full',
                        ev.type === 'delivered' ? 'bg-green-500/20 text-green-400' : ev.type === 'shoot' ? 'bg-accent/30 text-accent-foreground' : 'bg-primary/10 text-primary'
                      )}>
                        {ev.type === 'delivered' ? 'Delivered' : ev.type === 'shoot' ? 'Shoot' : 'Planned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
