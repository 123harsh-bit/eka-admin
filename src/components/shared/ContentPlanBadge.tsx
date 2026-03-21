import { CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
}

export function ContentPlanBadge({ className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium', className)}>
      <CalendarRange size={10} /> From Content Plan
    </span>
  );
}
