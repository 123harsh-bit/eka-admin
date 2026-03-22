import { useMemo } from 'react';
import { getContentTypeConfig, getPlatformConfig, CONTENT_ITEM_STATUSES } from '@/lib/statusConfig';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentItem } from '@/lib/contentTypes';

interface Props {
  items: ContentItem[];
  month: number;
  year: number;
  onItemClick: (item: ContentItem) => void;
  onAddClick: (date: string) => void;
}

export function ContentListView({ items, month, year, onItemClick, onAddClick }: Props) {
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const totalDays = lastDay.getDate();
    const weekGroups: { label: string; startDate: string; items: ContentItem[] }[] = [];
    let weekNum = 1;
    let weekStart = 1;

    while (weekStart <= totalDays) {
      const weekEnd = Math.min(weekStart + 6, totalDays);
      const startStr = `${year}-${String(month).padStart(2,'0')}-${String(weekStart).padStart(2,'0')}`;
      const endStr = `${year}-${String(month).padStart(2,'0')}-${String(weekEnd).padStart(2,'0')}`;
      const monthName = firstDay.toLocaleString('en', { month: 'short' });
      const weekItems = items.filter(i => i.planned_date && i.planned_date >= startStr && i.planned_date <= endStr);
      weekGroups.push({ label: `Week ${weekNum} — ${monthName} ${weekStart}–${weekEnd}`, startDate: startStr, items: weekItems });
      weekStart = weekEnd + 1;
      weekNum++;
    }
    const undated = items.filter(i => !i.planned_date);
    if (undated.length > 0) weekGroups.push({ label: 'Unscheduled', startDate: '', items: undated });
    return weekGroups;
  }, [items, month, year]);

  return (
    <div className="space-y-6">
      {weeks.map((week, wi) => (
        <div key={wi} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{week.label}</h3>
            {week.startDate && (
              <button onClick={() => onAddClick(week.startDate)} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus size={12} /> Add
              </button>
            )}
          </div>

          {week.items.length === 0 ? (
            <div className="glass-card p-4 text-center text-xs text-muted-foreground">No content planned</div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {week.items.map(item => {
                    const typeCfg = getContentTypeConfig(item.content_type);
                    const platCfg = getPlatformConfig(item.platform);
                    const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];

                    return (
                      <tr
                        key={item.id}
                        onClick={() => onItemClick(item)}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3 w-8">
                          <span className="text-base">{platCfg.icon}</span>
                        </td>
                        <td className="p-3">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', typeCfg.color)}>{typeCfg.label}</span>
                        </td>
                        <td className="p-3 font-medium text-foreground">{item.title}</td>
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                          {item.planned_date && new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                        </td>
                        <td className="p-3">
                          {statusCfg && (
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', statusCfg.bgColor, statusCfg.color)}>
                              {statusCfg.emoji} {statusCfg.label}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {item.linked_video_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">📹</span>}
                            {item.linked_writing_task_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">✍️</span>}
                            {item.linked_design_task_id && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">🎨</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
