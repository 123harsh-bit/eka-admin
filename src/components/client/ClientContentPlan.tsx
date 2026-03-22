import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ContentItem, ContentPlan } from '@/lib/contentTypes';
import { getContentTypeConfig, getPlatformConfig, CONTENT_ITEM_STATUSES, PLATFORM_OPTIONS } from '@/lib/statusConfig';
import { ChevronLeft, ChevronRight, Calendar, List, Check, MessageSquare, ExternalLink, Eye, Sparkles } from 'lucide-react';
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
  const [view, setView] = useState<'calendar' | 'list'>('list');
  const [approving, setApproving] = useState(false);
  const [changeFeedback, setChangeFeedback] = useState('');
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

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
  const totalReady = items.filter(i => i.status === 'ready').length;
  const totalInProduction = items.filter(i => i.status === 'in_production').length;
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
      case 'planned': return { label: '📋 Coming up', color: 'text-muted-foreground bg-muted/50' };
      case 'in_production': return { label: '🔄 Being created', color: 'text-blue-400 bg-blue-500/10' };
      case 'ready': return { label: '✅ Ready to go live', color: 'text-emerald-400 bg-emerald-500/10' };
      case 'published': return { label: '🟢 Live', color: 'text-success bg-success/10' };
      default: return { label: status, color: 'text-muted-foreground bg-muted/50' };
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
          <p className="text-xs text-muted-foreground/60 mt-1">Your team is working on it!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero banner — premium gradient */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-accent/10 border border-primary/20 p-6 sm:p-8 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={18} className="text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Content Plan</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            {getMonthName(month)} {year}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            {items.length} pieces of content across {Object.keys(platformSummary).length} platform{Object.keys(platformSummary).length > 1 ? 's' : ''}
          </p>
          
          {/* Platform pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(platformSummary).map(([platform, { total, published }]) => {
              const cfg = getPlatformConfig(platform);
              return (
                <div key={platform} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 text-sm">
                  <span>{cfg.icon}</span>
                  <span className="font-medium text-foreground">{cfg.label}</span>
                  <span className="text-muted-foreground">{total}</span>
                  {published > 0 && <span className="text-success text-xs">• {published} live</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Approval banner */}
      {plan.status === 'sent_for_approval' && (
        <div className="rounded-2xl p-5 space-y-4 border-2 border-warning/40 bg-gradient-to-br from-warning/10 to-warning/5">
          <div>
            <h3 className="font-display font-semibold text-foreground text-lg">📋 Your content plan is ready!</h3>
            <p className="text-sm text-muted-foreground mt-1">Review everything below, then approve to start production</p>
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
              <Button onClick={approvePlan} disabled={approving} className="gap-2 shadow-lg">
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
          <span className="text-sm font-medium text-success">Plan approved{plan.approved_at ? ` on ${new Date(plan.approved_at).toLocaleDateString()}` : ''} — Production in progress!</span>
        </div>
      )}

      {/* Strategy */}
      {plan.strategy_notes && (
        <div className="rounded-2xl p-5 sm:p-6 space-y-3 bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔖</span>
            <h3 className="text-sm font-display font-semibold text-foreground">This Month's Content Strategy</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{plan.strategy_notes}</p>
        </div>
      )}

      {/* Platform summary cards — larger, more visual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(platformSummary).map(([platform, { total, published }]) => {
          const cfg = getPlatformConfig(platform);
          const pct = total > 0 ? Math.round((published / total) * 100) : 0;
          return (
            <div key={platform} className="glass-card p-4 sm:p-5 text-center space-y-2 hover:border-primary/30 transition-colors">
              <span className="text-3xl block">{cfg.icon}</span>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">{cfg.label}</p>
              <p className="text-2xl font-display font-bold text-foreground">{total}</p>
              <p className="text-[10px] text-muted-foreground">{total === 1 ? 'piece' : 'pieces'} of content</p>
              {published > 0 ? (
                <div className="flex items-center justify-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  <p className="text-[10px] font-medium text-success">{published} live ({pct}%)</p>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground/50">Coming soon</p>
              )}
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
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          <button onClick={() => setView('list')} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
            <List size={14} className="inline mr-1" /> List
          </button>
          <button onClick={() => setView('calendar')} className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-colors', view === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
            <Calendar size={14} className="inline mr-1" /> Calendar
          </button>
        </div>
      </div>

      {/* Content view */}
      {view === 'calendar' ? (
        <ClientCalendarGrid items={items} month={month} year={year} />
      ) : (
        <ClientCardListView items={items} expandedItem={expandedItem} setExpandedItem={setExpandedItem} getStatusLabel={getStatusLabel} />
      )}

      {/* Monthly Progress */}
      <div className="rounded-2xl p-5 sm:p-6 space-y-4 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
        <h3 className="font-display font-semibold text-foreground">{getMonthName(month)} Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{totalPublished} of {items.length} published</span>
            <span className="font-bold text-foreground">{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex gap-4 text-[10px] text-muted-foreground mt-2">
            <span>📋 {items.length - totalPublished - totalReady - totalInProduction} planned</span>
            <span>🔄 {totalInProduction} in production</span>
            <span>✅ {totalReady} ready</span>
            <span>🟢 {totalPublished} live</span>
          </div>
        </div>
        
        {/* Per-platform progress */}
        <div className="space-y-3 pt-2">
          {Object.entries(platformSummary).map(([platform, { total, published }]) => {
            const cfg = getPlatformConfig(platform);
            const pct = total > 0 ? (published / total) * 100 : 0;
            return (
              <div key={platform} className="flex items-center gap-3">
                <span className="text-sm w-24 flex items-center gap-1.5">{cfg.icon} <span className="font-medium">{cfg.label}</span></span>
                <div className="flex-1">
                  <Progress value={pct} className="h-2" />
                </div>
                <span className="text-xs text-muted-foreground w-14 text-right font-medium">{published}/{total}</span>
              </div>
            );
          })}
        </div>
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
                className="glass-card p-4 text-left hover:border-primary/30 transition-colors group"
              >
                <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{getMonthName(p.month)} {p.year}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">{p.status.replace('_', ' ')}</p>
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
    <div className="glass-card overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="p-2.5 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, i) => {
          const dayItems = itemsByDate[day.date] || [];
          return (
            <div key={i} className={cn(
              'min-h-[85px] border-b border-r border-border/30 p-1.5 transition-colors',
              !day.isCurrentMonth && 'opacity-20',
              day.date === today && 'bg-primary/5 border-primary/20',
              dayItems.length > 0 && day.isCurrentMonth && 'bg-card/50'
            )}>
              <span className={cn(
                'text-xs inline-flex',
                day.date === today 
                  ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground items-center justify-center font-bold' 
                  : 'text-muted-foreground font-medium'
              )}>{day.day}</span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 3).map(item => {
                  const cfg = getContentTypeConfig(item.content_type);
                  const platCfg = getPlatformConfig(item.platform);
                  return (
                    <div key={item.id} className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-medium truncate border',
                      cfg.color,
                      item.status === 'published' && 'opacity-70',
                      item.status === 'in_production' && 'animate-pulse'
                    )}>
                      {platCfg.icon} {item.title}
                      {item.status === 'ready' && ' ✅'}
                      {item.status === 'published' && ' 🟢'}
                    </div>
                  );
                })}
                {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Client card list view — beautiful card-based layout
function ClientCardListView({ 
  items, expandedItem, setExpandedItem, getStatusLabel 
}: { 
  items: ContentItem[]; 
  expandedItem: string | null;
  setExpandedItem: (id: string | null) => void;
  getStatusLabel: (s: string) => { label: string; color: string };
}) {
  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    items.forEach(item => {
      const key = item.planned_date || 'unscheduled';
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'unscheduled') return 1;
      if (b === 'unscheduled') return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {grouped.map(([date, dateItems]) => {
        const isToday = date === today;
        const dateObj = date !== 'unscheduled' ? new Date(date + 'T00:00') : null;
        
        return (
          <div key={date} className="space-y-2">
            <div className="flex items-center gap-2">
              {isToday && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
              <h4 className={cn(
                'text-xs font-bold uppercase tracking-wider',
                isToday ? 'text-primary' : 'text-muted-foreground'
              )}>
                {dateObj 
                  ? `${dateObj.toLocaleDateString('en', { weekday: 'long' })} · ${dateObj.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`
                  : 'Unscheduled'
                }
                {isToday && ' — Today'}
              </h4>
            </div>
            
            {dateItems.map(item => {
              const cfg = getContentTypeConfig(item.content_type);
              const platCfg = getPlatformConfig(item.platform);
              const status = getStatusLabel(item.status);
              const isExpanded = expandedItem === item.id;
              
              return (
                <div 
                  key={item.id}
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  className={cn(
                    'glass-card p-4 cursor-pointer transition-all hover:border-primary/30',
                    item.status === 'published' && 'border-success/20 bg-success/5',
                    item.status === 'ready' && 'border-emerald-500/20',
                    item.status === 'in_production' && 'border-blue-500/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Platform icon */}
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
                      item.status === 'published' ? 'bg-success/20' : 'bg-muted/50'
                    )}>
                      {platCfg.icon}
                    </div>
                    
                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', cfg.color)}>{cfg.label}</span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', status.color)}>{status.label}</span>
                      </div>
                      <p className="font-medium text-foreground mt-1.5 text-sm">{item.title}</p>
                    </div>
                    
                    {/* Action */}
                    <div className="flex-shrink-0">
                      {item.published_url ? (
                        <a 
                          href={item.published_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-success/20 text-success text-xs font-medium hover:bg-success/30 transition-colors"
                        >
                          <Eye size={12} /> View
                        </a>
                      ) : (
                        <ChevronRight size={16} className={cn(
                          'text-muted-foreground transition-transform',
                          isExpanded && 'rotate-90'
                        )} />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/30 space-y-3 animate-in fade-in slide-in-from-top-2">
                      {item.caption_brief && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Caption</p>
                          <p className="text-xs text-foreground/80 leading-relaxed">{item.caption_brief}</p>
                        </div>
                      )}
                      {item.hashtags && (
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Hashtags</p>
                          <p className="text-xs text-primary/70">{item.hashtags}</p>
                        </div>
                      )}
                      {item.published_url && (
                        <a 
                          href={item.published_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                        >
                          <ExternalLink size={12} /> View on {platCfg.label} →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
}
