import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ContentCalendarView } from '@/components/content/ContentCalendarView';
import { ContentListView } from '@/components/content/ContentListView';
import { ContentItemPanel } from '@/components/content/ContentItemPanel';
import { ContentItemDetail } from '@/components/content/ContentItemDetail';
import { CONTENT_TYPES, PLATFORM_OPTIONS, CONTENT_ITEM_STATUSES, getContentTypeConfig, getPlatformConfig, getAutoCreateTasks } from '@/lib/statusConfig';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { ContentPlan, ContentItem } from '@/lib/contentTypes';
import {
  ChevronLeft, ChevronRight, Calendar, List, Plus, Send, Check, Clock, Loader2, CalendarDays, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function AdminContentPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [strategyNotes, setStrategyNotes] = useState('');
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [sendingPlan, setSendingPlan] = useState(false);

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (selectedClientId) fetchPlanAndItems(); }, [selectedClientId, month, year]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name, logo_url').eq('is_active', true).order('name');
    if (data && data.length > 0) {
      setClients(data);
      setSelectedClientId(data[0].id);
    }
    setLoading(false);
  };

  const fetchPlanAndItems = async () => {
    if (!selectedClientId) return;
    setLoading(true);

    let { data: existingPlan } = await supabase.from('content_plans')
      .select('*').eq('client_id', selectedClientId).eq('month', month).eq('year', year).single();

    if (!existingPlan) {
      const { data: newPlan } = await supabase.from('content_plans').insert({
        client_id: selectedClientId, month, year, created_by: user?.id,
        title: `${getMonthName(month)} ${year} Content Plan`
      }).select().single();
      existingPlan = newPlan;
    }

    if (existingPlan) {
      setPlan(existingPlan as ContentPlan);
      setStrategyNotes(existingPlan.strategy_notes || '');

      const { data: itemsData } = await supabase.from('content_items')
        .select('*').eq('plan_id', existingPlan.id).order('planned_date');
      setItems((itemsData || []) as ContentItem[]);
    }
    setLoading(false);
  };

  const saveStrategy = async () => {
    if (!plan) return;
    setSavingStrategy(true);
    await supabase.from('content_plans').update({ strategy_notes: strategyNotes }).eq('id', plan.id);
    setPlan(p => p ? { ...p, strategy_notes: strategyNotes } : p);
    setSavingStrategy(false);
    toast({ title: 'Strategy saved' });
  };

  const sendForApproval = async () => {
    if (!plan || !selectedClientId) return;
    setSendingPlan(true);
    await supabase.from('content_plans').update({ status: 'sent_for_approval' }).eq('id', plan.id);
    
    const { data: clientData } = await supabase.from('clients').select('user_id, name').eq('id', selectedClientId).single();
    if (clientData?.user_id) {
      const platformCounts = items.reduce((acc, i) => { acc[i.platform] = (acc[i.platform] || 0) + 1; return acc; }, {} as Record<string, number>);
      const platformStr = Object.entries(platformCounts).map(([p, c]) => `${getPlatformLabel(p)} ${c}`).join(', ');
      await supabase.from('notifications').insert({
        recipient_id: clientData.user_id,
        message: `📅 Your ${getMonthName(month)} content plan is ready! ${items.length} pieces of content planned across ${platformStr}. Log in to review and approve.`,
        type: 'content_plan',
        related_client_id: selectedClientId,
      });
    }
    
    setPlan(p => p ? { ...p, status: 'sent_for_approval' } : p);
    setSendingPlan(false);
    toast({ title: '📤 Plan sent for client approval!' });
  };

  const handleAddItem = async (itemData: Partial<ContentItem>) => {
    if (!plan || !selectedClientId || !user) return;

    const autoTasks = getAutoCreateTasks(itemData.content_type || 'other');
    let linked_video_id: string | null = null;
    let linked_writing_task_id: string | null = null;
    let linked_design_task_id: string | null = null;

    if (autoTasks.video) {
      const { data: video } = await supabase.from('videos').insert({
        client_id: selectedClientId,
        title: itemData.title || 'Untitled',
        status: 'idea',
        date_planned: itemData.planned_date || null,
      }).select('id').single();
      if (video) linked_video_id = video.id;
    }

    if (autoTasks.writing && autoTasks.writingType) {
      const writingTitle = autoTasks.video
        ? `${itemData.title} — Script`
        : autoTasks.writingType === 'ad_copy' ? `${itemData.title} — Ad Copy` : `${itemData.title} — Caption`;
      const { data: wt } = await supabase.from('writing_tasks').insert({
        client_id: selectedClientId,
        title: writingTitle,
        task_type: autoTasks.writingType,
        status: 'briefed',
        due_date: itemData.planned_date || null,
        video_id: linked_video_id || null,
      }).select('id').single();
      if (wt) linked_writing_task_id = wt.id;
    }

    if (autoTasks.design && autoTasks.designType) {
      const designTitle = autoTasks.video
        ? `${itemData.title} — Thumbnail`
        : autoTasks.designType === 'social_graphic' ? `${itemData.title} — Graphic` : `${itemData.title} — Creative`;
      const { data: dt } = await supabase.from('design_tasks').insert({
        client_id: selectedClientId,
        title: designTitle,
        task_type: autoTasks.designType,
        status: 'briefed',
        due_date: itemData.planned_date || null,
        video_id: linked_video_id || null,
      }).select('id').single();
      if (dt) linked_design_task_id = dt.id;
    }

    const { error } = await supabase.from('content_items').insert({
      plan_id: plan.id,
      client_id: selectedClientId,
      title: itemData.title || 'Untitled',
      content_type: itemData.content_type || 'other',
      platform: itemData.platform || 'other',
      planned_date: itemData.planned_date || null,
      caption_brief: itemData.caption_brief || null,
      visual_brief: itemData.visual_brief || null,
      reference_url: itemData.reference_url || null,
      hashtags: itemData.hashtags || null,
      linked_video_id,
      linked_writing_task_id,
      linked_design_task_id,
    });

    if (error) {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    } else {
      const taskList = [
        autoTasks.video && '🎬 1 Video',
        autoTasks.writing && '✍️ 1 Writing task',
        autoTasks.design && '🎨 1 Design task',
      ].filter(Boolean).join(', ');
      toast({ title: '✅ Added to plan!', description: taskList ? `Created: ${taskList}` : undefined });
      setShowAddPanel(false);
      fetchPlanAndItems();
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<ContentItem>) => {
    await supabase.from('content_items').update(updates).eq('id', id);
    fetchPlanAndItems();
  };

  const filteredItems = useMemo(() => {
    if (platformFilter === 'all') return items;
    return items.filter(i => i.platform === platformFilter);
  }, [items, platformFilter]);

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach(i => { counts[i.platform] = (counts[i.platform] || 0) + 1; });
    return counts;
  }, [items]);

  // Upcoming posts: today, tomorrow, day after
  const upcomingPosts = useMemo(() => {
    const today = new Date();
    const dates: { label: string; date: string; items: ContentItem[] }[] = [];
    for (let offset = 0; offset < 3; offset++) {
      const d = new Date(today);
      d.setDate(d.getDate() + offset);
      const dateStr = d.toISOString().split('T')[0];
      const label = offset === 0 ? '📌 Today' : offset === 1 ? '📅 Tomorrow' : '📆 Day After';
      const dayItems = items.filter(i => i.planned_date === dateStr);
      dates.push({ label, date: dateStr, items: dayItems });
    }
    return dates;
  }, [items]);

  const hasUpcomingPosts = upcomingPosts.some(d => d.items.length > 0);

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const goToThisMonth = () => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchPlanAndItems}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold gradient-text">Content Planner</h1>
              <p className="text-muted-foreground mt-1">Plan, schedule, and track content across all platforms</p>
            </div>
          </div>

          {/* Client selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                  selectedClientId === c.id
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-card/60 border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
                )}
              >
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary">{c.name.charAt(0)}</div>
                )}
                {c.name}
              </button>
            ))}
          </div>

          {selectedClientId && (
            <>
              {/* Upcoming Posts — What to post today/tomorrow/day after */}
              {hasUpcomingPosts && (
                <div className="glass-card p-4 space-y-3 border-primary/20">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={16} className="text-primary" />
                    <h3 className="text-sm font-display font-semibold text-foreground">What's Coming Up</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {upcomingPosts.map(day => (
                      <div key={day.date} className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{day.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(day.date + 'T00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {day.items.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/60 py-2 text-center">Nothing scheduled</p>
                        ) : (
                          <div className="space-y-1.5">
                            {day.items.map(item => {
                              const cfg = getContentTypeConfig(item.content_type);
                              const platCfg = getPlatformConfig(item.platform);
                              const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => setSelectedItem(item)}
                                  className="w-full text-left flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                                >
                                  <span className="text-base flex-shrink-0">{platCfg.icon}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border', cfg.color)}>{cfg.label}</span>
                                      {statusCfg && (
                                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', statusCfg.bgColor, statusCfg.color)}>
                                          {statusCfg.emoji}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Month navigator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigateMonth(-1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-xl font-display font-bold text-foreground">{getMonthName(month)} {year}</h2>
                  <button onClick={() => navigateMonth(1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={goToThisMonth} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                    This Month
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setView('calendar')} className={cn('p-2 rounded-lg transition-colors', view === 'calendar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    <Calendar size={16} />
                  </button>
                  <button onClick={() => setView('list')} className={cn('p-2 rounded-lg transition-colors', view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    <List size={16} />
                  </button>
                </div>
              </div>

              {/* Plan status bar */}
              {plan && (
                <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    {plan.status === 'draft' && (
                      <>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">Draft</span>
                        <span className="text-sm text-muted-foreground">{items.length} items planned</span>
                      </>
                    )}
                    {plan.status === 'sent_for_approval' && (
                      <>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-warning/20 text-warning font-medium">⏳ Awaiting Approval</span>
                        <span className="text-sm text-muted-foreground">Sent to client</span>
                      </>
                    )}
                    {plan.status === 'client_approved' && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-success/20 text-success font-medium">✅ Client Approved{plan.approved_at ? ` on ${new Date(plan.approved_at).toLocaleDateString()}` : ''}</span>
                    )}
                    {plan.status === 'active' && (
                      <>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary font-medium">Active</span>
                        <span className="text-sm text-muted-foreground">
                          {items.filter(i => i.status === 'published').length}/{items.length} published
                        </span>
                      </>
                    )}
                    {plan.status === 'completed' && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-success/20 text-success font-medium">✅ Completed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.status === 'draft' && items.length > 0 && (
                      <Button size="sm" onClick={sendForApproval} disabled={sendingPlan} className="gap-2">
                        {sendingPlan ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send to Client
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Strategy Notes */}
              <div className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">📌 Monthly Strategy</h3>
                  {strategyNotes !== (plan?.strategy_notes || '') && (
                    <Button size="sm" variant="outline" onClick={saveStrategy} disabled={savingStrategy}>
                      {savingStrategy ? 'Saving…' : 'Save'}
                    </Button>
                  )}
                </div>
                <textarea
                  value={strategyNotes}
                  onChange={e => setStrategyNotes(e.target.value)}
                  placeholder="Describe the content strategy for this month…"
                  className="w-full bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[60px]"
                  rows={3}
                />
              </div>

              {/* Platform filter tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setPlatformFilter('all')}
                  className={cn('text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors', platformFilter === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}
                >
                  All ({items.length})
                </button>
                {PLATFORM_OPTIONS.filter(p => platformCounts[p.value]).map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPlatformFilter(p.value)}
                    className={cn('text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors', platformFilter === p.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}
                  >
                    {p.icon} {p.label} ({platformCounts[p.value]})
                  </button>
                ))}
              </div>

              {/* Content view */}
              {loading ? (
                <div className="glass-card p-16 text-center">
                  <Loader2 size={24} className="animate-spin mx-auto text-primary" />
                </div>
              ) : view === 'calendar' ? (
                <ContentCalendarView
                  items={filteredItems}
                  month={month}
                  year={year}
                  onDayClick={(date) => { setAddDate(date); setShowAddPanel(true); }}
                  onItemClick={(item) => setSelectedItem(item)}
                />
              ) : (
                <ContentListView
                  items={filteredItems}
                  month={month}
                  year={year}
                  onItemClick={(item) => setSelectedItem(item)}
                  onAddClick={(date) => { setAddDate(date); setShowAddPanel(true); }}
                />
              )}

              {/* Add FAB for mobile */}
              <button
                onClick={() => { setAddDate(null); setShowAddPanel(true); }}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-30 lg:hidden"
              >
                <Plus size={24} />
              </button>
            </>
          )}
        </div>
      </PullToRefresh>

      {/* Add Panel */}
      {showAddPanel && plan && selectedClientId && (
        <ContentItemPanel
          clientId={selectedClientId}
          planId={plan.id}
          defaultDate={addDate}
          onSave={handleAddItem}
          onClose={() => setShowAddPanel(false)}
        />
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <ContentItemDetail
          item={selectedItem}
          onUpdate={handleUpdateItem}
          onClose={() => { setSelectedItem(null); fetchPlanAndItems(); }}
        />
      )}
    </AdminLayout>
  );
}

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
}

function getPlatformLabel(p: string) {
  return PLATFORM_OPTIONS.find(o => o.value === p)?.label || p;
}
