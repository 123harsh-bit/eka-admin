import { useMemo } from 'react';
import { getContentTypeConfig, CONTENT_ITEM_STATUSES } from '@/lib/statusConfig';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/contentTypes';

interface Props {
  items: ContentItem[];
  month: number;
  year: number;
  onDayClick: (date: string) => void;
  onItemClick: (item: ContentItem) => void;
}

export function ContentCalendarView({ items, month, year, onDayClick, onItemClick }: Props) {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month - 1, d);
      days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month, d);
        days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: false });
      }
    }

    return days;
  }, [month, year]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    items.forEach(item => {
      if (item.planned_date) {
        if (!map[item.planned_date]) map[item.planned_date] = [];
        map[item.planned_date].push(item);
      }
    });
    return map;
  }, [items]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayItems = itemsByDate[day.date] || [];
          const isToday = day.date === today;

          return (
            <div
              key={i}
              className={cn(
                'min-h-[100px] border-b border-r border-border/50 p-1.5 relative group transition-colors',
                !day.isCurrentMonth && 'opacity-30',
                isToday && 'bg-primary/5'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  'text-xs font-medium',
                  isToday ? 'h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center' : 'text-muted-foreground'
                )}>
                  {day.day}
                </span>
                {day.isCurrentMonth && (
                  <button
                    onClick={() => onDayClick(day.date)}
                    className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const cfg = getContentTypeConfig(item.content_type);
                  const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];
                  return (
                    <button
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      className={cn(
                        'w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border transition-all hover:scale-[1.02]',
                        cfg.color,
                        item.status === 'in_production' && 'animate-pulse',
                        item.status === 'published' && 'opacity-70',
                        item.status === 'cancelled' && 'line-through opacity-40'
                      )}
                    >
                      {cfg.icon} {item.title}
                      {item.status === 'ready' && ' ✅'}
                      {item.status === 'published' && ' 🟢'}
                    </button>
                  );
                })}
                {dayItems.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
