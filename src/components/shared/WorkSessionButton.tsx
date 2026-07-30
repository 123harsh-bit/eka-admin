import { Play, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useElapsedLabel, type WorkEntityType, type WorkSession } from '@/hooks/useWorkSession';

interface WorkSessionButtonProps {
  entityType: WorkEntityType;
  entityId: string;
  title?: string | null;
  clientId?: string | null;
  active: WorkSession | null;
  busy?: boolean;
  onStart: (args: { entityType: WorkEntityType; entityId: string; title?: string | null; clientId?: string | null }) => void;
  onStop: () => void;
  className?: string;
}

/**
 * "Start / Working (stop)" toggle usable on any task card in any pipeline stage.
 * Only one task can be active per person, so admins always know the real focus.
 */
export function WorkSessionButton({
  entityType, entityId, title, clientId, active, busy, onStart, onStop, className,
}: WorkSessionButtonProps) {
  const isActive = active?.entity_id === entityId;
  const elapsed = useElapsedLabel(isActive ? active?.started_at : null);
  const otherActive = !!active && !isActive;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isActive) onStop();
        else onStart({ entityType, entityId, title, clientId });
      }}
      disabled={busy}
      title={otherActive ? `Starting this will pause "${active?.entity_title || 'your current task'}"` : undefined}
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-semibold py-1 px-2 rounded border transition-colors disabled:opacity-60',
        isActive
          ? 'bg-success text-success-foreground border-success hover:bg-success/85'
          : 'bg-primary/20 text-primary border-primary/50 hover:bg-primary/30',
        className,
      )}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : isActive ? <Square size={10} /> : <Play size={10} />}
      {isActive ? (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          Working {elapsed ? `· ${elapsed}` : ''} — Stop
        </>
      ) : (
        'Start Work'
      )}
    </button>
  );
}
