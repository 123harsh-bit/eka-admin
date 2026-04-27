import { differenceInHours, isPast } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  dueDate: string | null | undefined;
  className?: string;
  compact?: boolean;
}

/**
 * Shows a deadline status badge:
 *  - Overdue (red) if past
 *  - Due soon (neon yellow) if within 48h
 *  - Hidden if more than 48h away or no date
 */
export function DeadlineBadge({ dueDate, className, compact }: Props) {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const overdue = isPast(date);
  const hoursLeft = differenceInHours(date, new Date());
  const dueSoon = !overdue && hoursLeft <= 48;

  if (!overdue && !dueSoon) return null;

  const Icon = overdue ? AlertTriangle : Clock;
  const label = overdue
    ? 'Overdue'
    : hoursLeft <= 24 ? `Due in ${hoursLeft}h` : 'Due soon';

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
      overdue ? 'bg-destructive/15 text-destructive' : 'bg-accent/20 text-accent',
      compact && 'px-1.5',
      className
    )}>
      <Icon size={9} />
      {!compact && label}
    </span>
  );
}
