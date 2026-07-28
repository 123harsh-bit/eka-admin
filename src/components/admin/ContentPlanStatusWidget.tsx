import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPlatformConfig } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';

interface PlanStatus {
  client_id: string;
  client_name: string;
  client_logo: string | null;
  plan_status: string;
  total_items: number;
  published_items: number;
  month: number;
  year: number;
}

export function ContentPlanStatusWidget() {
  const [plans, setPlans] = useState<PlanStatus[]>([]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: activePlans } = await supabase
      .from('content_plans')
      .select('id, client_id, status, month, year, clients(name, logo_url)')
      .eq('month', month)
      .eq('year', year)
      .not('status', 'eq', 'draft');

    if (!activePlans || activePlans.length === 0) return;

    const planIds = activePlans.map(plan => plan.id);
    const { data: items } = await supabase
      .from('content_items')
      .select('plan_id, status')
      .in('plan_id', planIds);

    const counts = (items || []).reduce<Record<string, { total: number; published: number }>>((acc, item) => {
      const bucket = (acc[item.plan_id] ||= { total: 0, published: 0 });
      bucket.total += 1;
      if (item.status === 'published') bucket.published += 1;
      return acc;
    }, {});

    const planStatuses: PlanStatus[] = activePlans.map(plan => {
      const client = plan.clients as { name: string; logo_url: string | null } | null;
      const count = counts[plan.id] || { total: 0, published: 0 };
      return {
        client_id: plan.client_id,
        client_name: client?.name || 'Unknown',
        client_logo: client?.logo_url || null,
        plan_status: plan.status,
        total_items: count.total,
        published_items: count.published,
        month: plan.month,
        year: plan.year,
      };
    });

    setPlans(planStatuses);
  };

  if (plans.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4 lg:col-span-2">
      <h2 className="text-lg font-display font-semibold text-foreground">📅 Content Plan Status</h2>
      <div className="space-y-2">
        {plans.map(plan => {
          const pct = plan.total_items > 0 ? Math.round((plan.published_items / plan.total_items) * 100) : 0;
          return (
            <div key={plan.client_id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              {plan.client_logo ? (
                <img src={plan.client_logo} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{plan.client_name.charAt(0)}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{plan.client_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{plan.published_items}/{plan.total_items}</span>
                </div>
              </div>
              <a href="/admin/content-planner" className="text-[10px] text-primary hover:underline flex-shrink-0">View →</a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
