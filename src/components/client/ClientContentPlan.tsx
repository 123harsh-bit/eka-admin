import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ContentItem, ContentPlan } from '@/lib/contentTypes';
import { getContentTypeConfig, getPlatformConfig, CONTENT_ITEM_STATUSES, PLATFORM_OPTIONS } from '@/lib/statusConfig';
import { ChevronLeft, ChevronRight, Calendar, List, Check, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface Props {
  clientId: string;
}

export function ClientContentPlan({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [pastPlans, setPastPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [approving, setApproving] = useState(false);
  const [changeFeedback, setChangeFeedback] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);

  useEffect(() => { fetchPlan(); }, [clientId, month, year]);
  useEffect(() => { fetchPastPlans(); }, [clientId]);

  const fetchPlan = async () => {
    setLoading(true);
    const { data: planData } = await supabase.from('content_plans')
      .select('*').eq('client_id', clientId).eq('month', month).eq('year', year).single();

    if (planData) {
      setPlan(planData as ContentPlan);
      const { data: itemsData } = await supabase.from('content_items')
        .select('*').eq('plan_id', planData.id).eq('is_visible_to_client', true).order('planned_date');
      setItems((itemsData || []).filter((i: any) => i.status !== 'cancelled') as ContentItem[]);
    } else {
      setPlan(null);
      setItems([]);
    }
    setLoading(false);
  };

  const fetchPastPlans = async () => {
    const { data } = await supabase.from('content_plans')
      .select('*').eq('client_id', clientId)
      .not('status', 'eq', 'draft')
      .order('year', { ascending: false }).order('month', { ascending: false }).limit(12);
    if (data) setPastPlans(data as ContentPlan[]);
  };

  const approvePlan = async () => {
    if (!plan) return;
    setApproving(true);
    await supabase.from('content_plans').update({ status: 'client_approved', approved_at: new Date().toISOString() }).eq('id', plan.id);

    // Notify admin
    const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const { data: clientData } = await supabase.from('clients').select('name').eq('id', clientId).single();
    if (admins && clientData) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({
          recipient_id: admin.user_id,
          message: `✅ ${clientData.name} approved the ${getMonthName(month)} content plan. Production can begin.`,
          type: 'content_plan',
          related_client_id: clientId,
        });
      }
    }

    setPlan(p => p ? { ...p, status: 'client_approved', approved_at: new Date().toISOString() } : p);
    setApproving(false);
    toast({ title: '✅ Plan approved!', description: 'The team has been notified to start production.' });
  };

  const requestChanges = async () => {
    if (!plan || !changeFeedback.trim()) return;
    const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const { data: clientData } = await supabase.from('clients').select('name').eq('id', clientId).single();
    if (admins && clientData) {
      for (const admin of admins) {
        await supabase.from('notifications').insert({
          recipient_id: admin.user_id,
          message: `✏️ ${clientData.name} requested changes to the ${getMonthName(month)} content plan: ${changeFeedback}`,
          type: 'content_plan',
          related_client_id: clientId,
        });
      }
    }
    setShowChangeForm(false);
    setChangeFeedback('');
    toast({ title: 'Feedback sent!', description: 'The team will review your changes.' });
  };

  const platformSummary = useMemo(() => {
    const map: Record<string, { total: number; published: number }> = {};
    items.forEach(i => {
      if (!map[i.platform]) map[i.platform] = { total: 0, published: 0 };
      map[i.platform].total++;
      if (i.status === 'published') map[i.platform].published++;
    });
    return map;
  }, [items]);

  const totalPublished = items.filter(i => i.status === 'published').length;
  const overallProgress = items.length > 0 ? (totalPublished / items.length) * 100 : 0;

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planned': return '📋 Coming up';
      case 'in_production': return '🔄 Being created';
      case 'ready': return '✅ Ready to go live';
      case 'published': return '🟢 Live';
      default: return status;
    }
  };

  if (loading) {
    return <div className="glass-card p-16 text-center"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" /></div>;
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><ChevronLeft size={16} /></button>
          <h2 className="text-xl font-display font-bold text-foreground">{getMonthName(month)} {year}</h2>
          <button onClick={() => navigateMonth(1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><ChevronRight size={16} /></button>
        </div>
        <div className="glass-card p-16 text-center">
          <Calendar size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No content plan for this month yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/30 via-primary/15 to-transparent border border-primary/20 p-6 space-y-3">
        <h2 className="text-2xl font-display font-bold text-foreground">
          📅 Your {getMonthName(month)} {year} Content Plan
        </h2>
        <p className="text-muted-foreground">
          {items.length} pieces of content across {Object.keys(platformSummary).length} platforms
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {Object.entries(platformSummary).map(([platform, { total }]) => {
            const cfg = getPlatformConfig(platform);
            return <span key={platform}>{cfg.icon} {cfg.label} {total}</span>;
          })}
        </div>
      </div>

      {/* Approval banner */}
      {plan.status === 'sent_for_approval' && (
        <div className="glass-card p-5 space-y-4 border-warning/30 bg-warning/5">
          <div>
            <h3 className="font-display font-semibold text-foreground">📋 Your content plan is ready for your approval</h3>
            <p className="text-sm text-muted-foreground mt-1">Review everything below then approve to get started</p>
          </div>
          {showChangeForm ? (
            <div className="space-y-3">
              <textarea
                value={changeFeedback}
                onChange={e => setChangeFeedback(e.target.value)}
                placeholder="Describe the changes you'd like..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={requestChanges} disabled={!changeFeedback.trim()}>Send Feedback</Button>
                <Button size="sm" variant="outline" onClick={() => setShowChangeForm(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button onClick={approvePlan} disabled={approving} className="gap-2">
                <Check size={14} /> Approve Plan
              </Button>
              <Button variant="outline" onClick={() => setShowChangeForm(true)} className="gap-2">
                <MessageSquare size={14} /> Request Changes
              </Button>
            </div>
          )}
        </div>
      )}

      {plan.status === 'client_approved' && (
        <div className="glass-card p-4 border-success/30 bg-success/5 flex items-center gap-2">
          <Check size={16} className="text-success" />
          <span className="text-sm font-medium text-success">Plan approved{plan.approved_at ? ` on ${new Date(plan.approved_at).toLocaleDateString()}` : ''}</span>
        </div>
      )}

      {/* Strategy */}
      {plan.strategy_notes && (
        <div className="glass-card p-5 space-y-2 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">🔖 This Month's Content Strategy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.strategy_notes}</p>
        </div>
      )}

      {/* Platform summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(platformSummary).map(([platform, { total, published }]) => {
          const cfg = getPlatformConfig(platform);
          return (
            <div key={platform} className="glass-card p-4 text-center space-y-1">
              <span className="text-2xl">{cfg.icon}</span>
              <p className="text-xs font-semibold text-foreground">{cfg.label}</p>
              <p className="text-lg font-display font-bold text-foreground">{total}</p>
              {published > 0 && <p className="text-[10px] text-success">{published} live ✅</p>}
            </div>
          );
        })}
      </div>

      {/* View toggle + month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><ChevronLeft size={16} /></button>
          <h3 className="font-display font-semibold text-foreground">{getMonthName(month)}</h3>
          <button onClick={() => navigateMonth(1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center"><ChevronRight size={16} /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView('calendar')} className={cn('p-2 rounded-lg', view === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}>
            <Calendar size={16} />
          </button>
          <button onClick={() => setView('list')} className={cn('p-2 rounded-lg', view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground')}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content view */}
      {view === 'calendar' ? (
        <ClientCalendarGrid items={items} month={month} year={year} />
      ) : (
        <ClientListView items={items} month={month} year={year} getStatusLabel={getStatusLabel} />
      )}

      {/* Monthly Progress */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground">{getMonthName(month)} Progress</h3>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{totalPublished} of {items.length} published</span>
            <span className="font-semibold text-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2.5" />
        </div>
        {Object.entries(platformSummary).map(([platform, { total, published }]) => {
          const cfg = getPlatformConfig(platform);
          const pct = total > 0 ? (published / total) * 100 : 0;
          return (
            <div key={platform} className="flex items-center gap-3">
              <span className="text-sm w-20">{cfg.icon} {cfg.label}</span>
              <div className="flex-1">
                <Progress value={pct} className="h-1.5" />
              </div>
              <span className="text-xs text-muted-foreground w-12 text-right">{published}/{total}</span>
            </div>
          );
        })}
      </div>

      {/* Past Plans */}
      {pastPlans.filter(p => !(p.month === month && p.year === year)).length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-semibold text-foreground">Previous Months</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pastPlans.filter(p => !(p.month === month && p.year === year)).map(p => (
              <button
                key={p.id}
                onClick={() => { setMonth(p.month); setYear(p.year); }}
                className="glass-card p-4 text-left hover:border-primary/30 transition-colors"
              >
                <p className="font-semibold text-foreground text-sm">{getMonthName(p.month)} {p.year}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.status.replace('_', ' ')}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Client calendar grid (read-only)
function ClientCalendarGrid({ items, month, year }: { items: ContentItem[]; month: number; year: number }) {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({ date: d.toISOString().split('T')[0], day: d.getDate(), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      days.push({ date: new Date(year, month - 1, d).toISOString().split('T')[0], day: d, isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push({ date: new Date(year, month, d).toISOString().split('T')[0], day: d, isCurrentMonth: false });
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
      <div className="grid grid-cols-7 border-b border-border">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayItems = itemsByDate[day.date] || [];
          return (
            <div key={i} className={cn('min-h-[80px] border-b border-r border-border/50 p-1.5', !day.isCurrentMonth && 'opacity-30', day.date === today && 'bg-primary/5')}>
              <span className={cn('text-xs', day.date === today ? 'h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold' : 'text-muted-foreground')}>{day.day}</span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const cfg = getContentTypeConfig(item.content_type);
                  return (
                    <div key={item.id} className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium truncate border', cfg.color, item.status === 'published' && 'opacity-70')}>
                      {cfg.icon} {item.title}
                      {item.status === 'ready' && ' ✅'}
                      {item.status === 'published' && ' 🟢'}
                    </div>
                  );
                })}
                {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayItems.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Client list view (read-only)
function ClientListView({ items, month, year, getStatusLabel }: { items: ContentItem[]; month: number; year: number; getStatusLabel: (s: string) => string }) {
  return (
    <div className="space-y-4">
      {items.map(item => {
        const cfg = getContentTypeConfig(item.content_type);
        const platCfg = getPlatformConfig(item.platform);
        return (
          <div key={item.id} className="glass-card p-4 flex items-center gap-4">
            <span className="text-2xl flex-shrink-0">{platCfg.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', cfg.color)}>{cfg.label}</span>
              </div>
              <p className="font-medium text-foreground mt-1">{item.title}</p>
              {item.planned_date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0 space-y-1">
              <p className="text-xs font-medium">{getStatusLabel(item.status)}</p>
              {item.published_url && (
                <a href={item.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 justify-end">
                  View → <ExternalLink size={10} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
}
