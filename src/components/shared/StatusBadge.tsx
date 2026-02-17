import { VIDEO_STATUSES, DESIGN_TASK_STATUSES, WRITING_TASK_STATUSES, VideoStatus, DesignTaskStatus, WritingTaskStatus } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  type: 'video' | 'design' | 'writing';
  clientView?: boolean;
  className?: string;
}

export function StatusBadge({ status, type, clientView = false, className }: StatusBadgeProps) {
  let config;
  if (type === 'video') config = VIDEO_STATUSES[status as VideoStatus];
  else if (type === 'design') config = DESIGN_TASK_STATUSES[status as DesignTaskStatus];
  else config = WRITING_TASK_STATUSES[status as WritingTaskStatus];

  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>;

  const label = clientView ? config.clientLabel : config.label;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor, config.color, className
    )}>
      <span>{config.emoji}</span>
      <span>{label}</span>
    </span>
  );
}
