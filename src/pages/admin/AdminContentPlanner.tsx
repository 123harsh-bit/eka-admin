import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ContentItemPanel } from '@/components/content/ContentItemPanel';
import { ContentItemDetail } from '@/components/content/ContentItemDetail';
import { CONTENT_TYPES, PLATFORM_OPTIONS, CONTENT_ITEM_STATUSES, getContentTypeConfig, getPlatformConfig, getAutoCreateTasks } from '@/lib/statusConfig';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { ContentPlan, ContentItem } from '@/lib/contentTypes';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Edit2, ExternalLink, Calendar
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
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [strategyNotes, setStrategyNotes] = useState('');
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleAddItem = async (itemData: Partial<ContentItem>) => {
    if (!plan || !selectedClientId || !user) return;

    const autoTasks = getAutoCreateTasks(itemData.content_type || 'other');
    let linked_video_id: string | null = null;
    let linked_writing_task_id: string | null = null;
    let linked_design_task_id: string | null = null;

    if (autoTasks.video) {
      const { data: video } = await supabase.from('videos').insert({
        client_id: selectedClientId, title: itemData.title || 'Untitled',
        status: 'idea', date_planned: itemData.planned_date || null,
      }).select('id').single();
      if (video) linked_video_id = video.id;
    }

    if (autoTasks.writing && autoTasks.writingType) {
      const writingTitle = autoTasks.video
        ? `${itemData.title} — Script`
        : autoTasks.writingType === 'ad_copy' ? `${itemData.title} — Ad Copy` : `${itemData.title} — Caption`;
      const { data: wt } = await supabase.from('writing_tasks').insert({
        client_id: selectedClientId, title: writingTitle, task_type: autoTasks.writingType,
        status: 'briefed', due_date: itemData.planned_date || null, video_id: linked_video_id || null,
      }).select('id').single();
      if (wt) linked_writing_task_id = wt.id;
    }

    if (autoTasks.design && autoTasks.designType) {
      const designTitle = autoTasks.video
        ? `${itemData.title} — Thumbnail`
        : `${itemData.title} — Graphic`;
      const { data: dt } = await supabase.from('design_tasks').insert({
        client_id: selectedClientId, title: designTitle, task_type: autoTasks.designType,
        status: 'briefed', due_date: itemData.planned_date || null, video_id: linked_video_id || null,
      }).select('id').single();
      if (dt) linked_design_task_id = dt.id;
    }

    const { error } = await supabase.from('content_items').insert({
      plan_id: plan.id, client_id: selectedClientId, title: itemData.title || 'Untitled',
      content_type: itemData.content_type || 'other', platform: itemData.platform || 'other',
      planned_date: itemData.planned_date || null, caption_brief: itemData.caption_brief || null,
      visual_brief: itemData.visual_brief || null, reference_url: itemData.reference_url || null,
      hashtags: itemData.hashtags || null, linked_video_id, linked_writing_task_id, linked_design_task_id,
    });

    if (error) {
      toast({ title: 'Error adding item', description: error.message, variant: 'destructive' });
    } else {
      const taskList = [autoTasks.video && '🎬 Video', autoTasks.writing && '✍️ Writing', autoTasks.design && '🎨 Design'].filter(Boolean).join(', ');
      toast({ title: '✅ Added!', description: taskList ? `Created: ${taskList}` : undefined });
      setShowAddPanel(false);
      fetchPlanAndItems();
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<ContentItem>) => {
    await supabase.from('content_items').update(updates).eq('id', id);
    fetchPlanAndItems();
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    setDeleting(true);

    // Delete linked tasks
    if (deleteItem.linked_video_id) await supabase.from('videos').delete().eq('id', deleteItem.linked_video_id);
    if (deleteItem.linked_writing_task_id) await supabase.from('writing_tasks').delete().eq('id', deleteItem.linked_writing_task_id);
    if (deleteItem.linked_design_task_id) await supabase.from('design_tasks').delete().eq('id', deleteItem.linked_design_task_id);

    await supabase.from('content_items').delete().eq('id', deleteItem.id);
    setDeleting(false);
    setDeleteItem(null);
    toast({ title: '🗑️ Deleted', description: 'Content item and linked tasks removed' });
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

  // Group items by timeframe
  const groupedItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().split('T')[0];

    const endOfNextWeek = new Date(endOfWeek);
    endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
    const endOfNextWeekStr = endOfNextWeek.toISOString().split('T')[0];

    const groups: { label: string; emoji: string; items: ContentItem[]; color: string }[] = [
      { label: 'Today', emoji: '🔴', items: [], color: 'border-destructive/30' },
      { label: 'Tomorrow', emoji: '🟡', items: [], color: 'border-warning/30' },
      { label: 'This Week', emoji: '📅', items: [], color: 'border-primary/20' },
      { label: 'Next Week', emoji: '📆', items: [], color: 'border-border' },
      { label: 'Later', emoji: '📋', items: [], color: 'border-border' },
      { label: 'Unscheduled', emoji: '❓', items: [], color: 'border-muted' },
    ];

    filteredItems.forEach(item => {
      if (!item.planned_date) { groups[5].items.push(item); return; }
      if (item.planned_date === todayStr) groups[0].items.push(item);
      else if (item.planned_date === tomorrowStr) groups[1].items.push(item);
      else if (item.planned_date <= endOfWeekStr && item.planned_date > tomorrowStr) groups[2].items.push(item);
      else if (item.planned_date <= endOfNextWeekStr && item.planned_date > endOfWeekStr) groups[3].items.push(item);
      else if (item.planned_date > endOfNextWeekStr) groups[4].items.push(item);
      else groups[4].items.push(item); // past dates go to "Later"
    });

    return groups.filter(g => g.items.length > 0);
  }, [filteredItems]);

  const navigateMonth = (dir: number) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const goToThisMonth = () => {
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
  };

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchPlanAndItems}>
        <div className="space-y-5 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Content Planner</h1>
              <p className="text-sm text-muted-foreground">Plan and track content across platforms</p>
            </div>
            <Button onClick={() => { setAddDate(null); setShowAddPanel(true); }} size="sm" className="gap-1.5">
              <Plus size={14} /> Add
            </Button>
          </div>

          {/* Client selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border',
                  selectedClientId === c.id
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                ) : (
                  <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">{c.name.charAt(0)}</div>
                )}
                {c.name}
              </button>
            ))}
          </div>

          {selectedClientId && (
            <>
              {/* Month navigator */}
              <div className="flex items-center gap-3">
                <button onClick={() => navigateMonth(-1)} className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <ChevronLeft size={14} />
                </button>
                <h2 className="text-base font-bold text-foreground">{getMonthName(month)} {year}</h2>
                <button onClick={() => navigateMonth(1)} className="h-7 w-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <ChevronRight size={14} />
                </button>
                <button onClick={goToThisMonth} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                  Today
                </button>
                <span className="text-xs text-muted-foreground ml-auto">{items.length} items</span>
              </div>

              {/* Strategy Notes */}
              {plan && (
                <div className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Strategy</p>
                    {strategyNotes !== (plan.strategy_notes || '') && (
                      <Button size="sm" variant="outline" onClick={saveStrategy} disabled={savingStrategy} className="h-6 text-[11px]">
                        {savingStrategy ? 'Saving…' : 'Save'}
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={strategyNotes}
                    onChange={e => setStrategyNotes(e.target.value)}
                    placeholder="Describe the content strategy for this month…"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[50px] border-0"
                    rows={2}
                  />
                </div>
              )}

              {/* Platform filter */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setPlatformFilter('all')}
                  className={cn('text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors', platformFilter === 'all' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}
                >
                  All ({items.length})
                </button>
                {PLATFORM_OPTIONS.filter(p => platformCounts[p.value]).map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPlatformFilter(p.value)}
                    className={cn('text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors', platformFilter === p.value ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground')}
                  >
                    {p.icon} {p.label} ({platformCounts[p.value]})
                  </button>
                ))}
              </div>

              {/* Content Items grouped by timeframe */}
              {loading ? (
                <div className="glass-card p-12 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-primary" />
                </div>
              ) : groupedItems.length === 0 ? (
                <div className="glass-card p-12 text-center space-y-3">
                  <Calendar size={32} className="mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No content planned for {getMonthName(month)}</p>
                  <Button size="sm" variant="outline" onClick={() => { setAddDate(null); setShowAddPanel(true); }} className="gap-1.5">
                    <Plus size={12} /> Add first item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedItems.map(group => (
                    <div key={group.label} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-sm">{group.emoji}</span>
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{group.label}</h3>
                        <span className="text-[10px] text-muted-foreground">{group.items.length}</span>
                      </div>

                      <div className="space-y-1.5">
                        {group.items.map(item => {
                          const typeCfg = getContentTypeConfig(item.content_type);
                          const platCfg = getPlatformConfig(item.platform);
                          const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                'glass-card p-3 flex items-center gap-3 group transition-colors hover:bg-card/80 border-l-2',
                                group.color,
                                item.status === 'cancelled' && 'opacity-40'
                              )}
                            >
                              {/* Platform icon */}
                              <span className="text-lg flex-shrink-0">{platCfg.icon}</span>

                              {/* Main content */}
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', typeCfg.color)}>{typeCfg.label}</span>
                                  {statusCfg && (
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', statusCfg.bgColor, statusCfg.color)}>
                                      {statusCfg.emoji} {statusCfg.label}
                                    </span>
                                  )}
                                </div>
                                <p className={cn('text-sm font-medium text-foreground truncate', item.status === 'cancelled' && 'line-through')}>
                                  {item.title}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {item.planned_date && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1">
                                    {item.linked_video_id && <span className="text-[9px] px-1 rounded bg-destructive/10 text-destructive">📹</span>}
                                    {item.linked_writing_task_id && <span className="text-[9px] px-1 rounded bg-primary/10 text-primary">✍️</span>}
                                    {item.linked_design_task_id && <span className="text-[9px] px-1 rounded bg-secondary/10 text-secondary">🎨</span>}
                                  </div>
                                </div>
                              </button>

                              {/* Actions */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                <button
                                  onClick={() => setSelectedItem(item)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => setDeleteItem(item)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          onDelete={(item) => { setSelectedItem(null); setDeleteItem(item); }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        open={!!deleteItem}
        onOpenChange={(open) => { if (!open) setDeleteItem(null); }}
        title="Delete Content Item"
        description={deleteItem ? `Delete "${deleteItem.title}" and all linked production tasks?` : ''}
        onConfirm={handleDeleteItem}
      />
    </AdminLayout>
  );
}

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
}