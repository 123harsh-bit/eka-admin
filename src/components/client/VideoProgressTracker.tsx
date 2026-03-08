import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';
import { getStatusOrderForClient, VIDEO_STATUSES, getClientLabel, type VideoStatus, type ClientServiceType } from '@/lib/statusConfig';

interface VideoProgressTrackerProps {
  videoTitle: string;
  currentStatus: string;
  serviceType: ClientServiceType;
}

export function VideoProgressTracker({ videoTitle, currentStatus, serviceType }: VideoProgressTrackerProps) {
  const statusOrder = getStatusOrderForClient(serviceType);
  const currentIdx = statusOrder.indexOf(currentStatus as VideoStatus);

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-semibold text-foreground text-sm truncate">{videoTitle}</h3>
      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-muted" />
        <div className="space-y-0">
          {statusOrder.map((status, i) => {
            const cfg = VIDEO_STATUSES[status];
            const label = getClientLabel(status, serviceType);
            const isCompleted = i < currentIdx;
            const isCurrent = i === currentIdx;
            const isFuture = i > currentIdx;

            return (
              <div key={status} className="relative flex items-center gap-3 py-1.5">
                <div className={cn(
                  'relative z-10 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110',
                  isFuture && 'bg-muted text-muted-foreground'
                )}>
                  {isCompleted ? <Check size={12} /> : isCurrent ? <Circle size={8} fill="currentColor" /> : <Circle size={8} />}
                </div>
                <span className={cn(
                  'text-xs font-medium transition-colors',
                  isCompleted && 'text-muted-foreground line-through',
                  isCurrent && 'text-primary font-semibold',
                  isFuture && 'text-muted-foreground/60'
                )}>
                  {label}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold animate-pulse">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
