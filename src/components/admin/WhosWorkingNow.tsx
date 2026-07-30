import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';

interface ActiveRow {
  id: string;
  user_id: string;
  full_name: string;
  entity_type: string;
  entity_title: string | null;
  started_at: string;
}

function elapsed(from: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(from).getTime()) / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  writing_task: 'Script',
  design_task: 'Design',
  shoot: 'Shoot',
  social_post: 'Post',
};

export function WhosWorkingNow() {
  const [rows, setRows] = useState<ActiveRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data } = await (supabase.rpc as (fn: string) => Promise<{ data: ActiveRow[] | null }>)('admin_active_work_sessions');
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const i = setInterval(fetch, 60000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-success" />
        <h2 className="text-sm font-semibold text-foreground">Working Right Now</h2>
        {!loading && <span className="text-[10px] text-muted-foreground">{rows.length} active</span>}
      </div>

      {loading ? (
        <div className="h-10 bg-muted/40 rounded animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nobody has an active task timer right now.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-success/5 border border-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse flex-shrink-0" />
              <span className="font-semibold text-foreground flex-shrink-0">{r.full_name}</span>
              <span className="text-muted-foreground truncate flex-1">
                {TYPE_LABEL[r.entity_type] || r.entity_type}: {r.entity_title || 'Untitled'}
              </span>
              <span className="text-[10px] text-success flex-shrink-0">{elapsed(r.started_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
