import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';

export function ClientSatisfactionWidget() {
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('client_ratings').select('rating');
      if (data && data.length > 0) {
        setAvg(Math.round((data.reduce((s, r) => s + r.rating, 0) / data.length) * 10) / 10);
        setCount(data.length);
      }
    };
    fetch();
  }, []);

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Client Satisfaction</p>
        <Star size={16} className="text-yellow-400" />
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-display font-bold text-foreground">{count > 0 ? avg : '—'}</p>
        {count > 0 && <span className="text-sm text-muted-foreground">/5</span>}
      </div>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} size={14} className={s <= Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'} />
        ))}
        <span className="text-xs text-muted-foreground ml-2">{count} review{count !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
