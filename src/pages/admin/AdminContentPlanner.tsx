import { useState, useEffect, useMemo, useRef } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ContentItemPanel } from '@/components/content/ContentItemPanel';
import { ContentItemDetail } from '@/components/content/ContentItemDetail';
import {
  CONTENT_ITEM_STATUSES,
  getContentTypeConfig,
  getPlatformConfig,
  getAutoCreateTasks,
} from '@/lib/statusConfig';
import { PullToRefresh } from '@/components/shared/PullToRefresh';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { ContentPlan, ContentItem } from '@/lib/contentTypes';
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Calendar, Download, FileText,
  LayoutGrid, List, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  brand_colors?: { primary?: string } | null;
}

type ViewMode = 'calendar' | 'list';

export default function AdminContentPlanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('calendar');

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [strategyNotes, setStrategyNotes] = useState('');
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { if (selectedClientId) fetchPlanAndItems(); }, [selectedClientId, month, year]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients')
      .select('id, name, logo_url, brand_colors')
      .eq('is_active', true).order('name');
    if (data && data.length > 0) {
      setClients(data as Client[]);
      setSelectedClientId(data[0].id);
    }
    setLoading(false);
  };

  const fetchPlanAndItems = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    let { data: existingPlan } = await supabase.from('content_plans')
      .select('*').eq('client_id', selectedClientId).eq('month', month).eq('year', year).maybeSingle();
    if (!existingPlan) {
      const { data: newPlan } = await supabase.from('content_plans').insert({
        client_id: selectedClientId, month, year, created_by: user?.id,
        title: `${getMonthName(month)} ${year} Content Plan`,
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
    toast({ title: '✓ Strategy saved' });
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
      const designTitle = autoTasks.video ? `${itemData.title} — Thumbnail` : `${itemData.title} — Graphic`;
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
      toast({ title: '✅ Added', description: taskList ? `Created: ${taskList}` : undefined });
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
    if (deleteItem.linked_video_id) await supabase.from('videos').delete().eq('id', deleteItem.linked_video_id);
    if (deleteItem.linked_writing_task_id) await supabase.from('writing_tasks').delete().eq('id', deleteItem.linked_writing_task_id);
    if (deleteItem.linked_design_task_id) await supabase.from('design_tasks').delete().eq('id', deleteItem.linked_design_task_id);
    await supabase.from('content_items').delete().eq('id', deleteItem.id);
    setDeleting(false);
    setDeleteItem(null);
    toast({ title: '🗑️ Deleted', description: 'Content item and linked tasks removed' });
    fetchPlanAndItems();
  };

  // Drag-and-drop reschedule
  const handleDragEnd = async (e: DragEndEvent) => {
    const itemId = e.active.id as string;
    const newDate = e.over?.id as string | undefined;
    if (!newDate) return;
    const item = items.find(i => i.id === itemId);
    if (!item || item.planned_date === newDate) return;

    // Optimistic
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, planned_date: newDate } : i));
    const { error } = await supabase.from('content_items').update({ planned_date: newDate }).eq('id', itemId);
    if (error) {
      toast({ title: 'Reschedule failed', variant: 'destructive' });
      fetchPlanAndItems();
    } else {
      toast({ title: '📅 Rescheduled' });
      // Sync the linked video's planned date too
      if (item.linked_video_id) {
        await supabase.from('videos').update({ date_planned: newDate }).eq('id', item.linked_video_id);
      }
    }
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#0A0F1E', scale: 2, useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFillColor(10, 15, 30);
      pdf.rect(0, 0, pdfWidth, 18, 'F');
      pdf.setTextColor(245, 158, 11);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const clientName = clients.find(c => c.id === selectedClientId)?.name || '';
      pdf.text(`${clientName} — ${getMonthName(month)} ${year} Content Plan`, 10, 12);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Eka Creative Agency · Confidential`, pdfWidth - 10, 12, { align: 'right' });

      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`${clientName}_${getMonthName(month)}_${year}_Content_Plan.pdf`);
      toast({ title: '📄 PDF exported' });
    } catch (e) {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
    setExporting(false);
  };

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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startPad = firstDay.getDay();
    const totalDays = lastDay.getDate();
    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, -i);
      days.push({ date: toISODate(d), day: d.getDate(), isCurrentMonth: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month - 1, d);
      days.push({ date: toISODate(date), day: d, isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month, d);
        days.push({ date: toISODate(date), day: d, isCurrentMonth: false });
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

  const today = toISODate(new Date());
  const selectedClient = clients.find(c => c.id === selectedClientId);

  const statusCounts = useMemo(() => {
    const counts = { planned: 0, in_production: 0, ready: 0, published: 0, cancelled: 0 };
    items.forEach(i => { if (counts[i.status as keyof typeof counts] !== undefined) counts[i.status as keyof typeof counts]++; });
    return counts;
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (!a.planned_date) return 1;
      if (!b.planned_date) return -1;
      return a.planned_date.localeCompare(b.planned_date);
    });
  }, [items]);

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchPlanAndItems}>
        <div className="space-y-5 max-w-[1400px] mx-auto">
          {/* Premium header */}
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={16} className="text-primary" />
                <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">Content Planner</p>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Plan, schedule & ship</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Drag any card to a different day to reschedule.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
                <button onClick={() => setView('calendar')} className={cn('px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5', view === 'calendar' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <LayoutGrid size={12} /> Calendar
                </button>
                <button onClick={() => setView('list')} className={cn('px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5', view === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground')}>
                  <List size={12} /> List
                </button>
              </div>
              <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1.5" disabled={exporting || items.length === 0}>
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                PDF
              </Button>
              <Button onClick={() => { setAddDate(null); setShowAddPanel(true); }} size="sm" className="gap-1.5">
                <Plus size={14} /> Add Content
              </Button>
            </div>
          </div>

          {/* Client chips */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border',
                  selectedClientId === c.id
                    ? 'bg-primary/15 border-primary/40 text-primary shadow-lg shadow-primary/10'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
                )}
              >
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">{c.name.charAt(0)}</div>
                )}
                {c.name}
              </button>
            ))}
          </div>

          {selectedClientId && (
            <>
              {/* Month nav + stats */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigateMonth(-1)} className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-xl font-bold text-foreground min-w-[180px] text-center tracking-tight">{getMonthName(month)} <span className="text-muted-foreground font-normal">{year}</span></h2>
                  <button onClick={() => navigateMonth(1)} className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted hover:border-primary/30 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={goToThisMonth} className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold border border-primary/20">
                    Today
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {[
                    { label: 'Planned', count: statusCounts.planned, dot: 'bg-muted-foreground' },
                    { label: 'In Production', count: statusCounts.in_production, dot: 'bg-info' },
                    { label: 'Ready', count: statusCounts.ready, dot: 'bg-success' },
                    { label: 'Published', count: statusCounts.published, dot: 'bg-emerald-400' },
                  ].map(s => s.count > 0 && (
                    <div key={s.label} className="flex items-center gap-1.5 text-xs">
                      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                      <span className="font-semibold text-foreground">{s.count}</span>
                      <span className="text-muted-foreground hidden sm:inline">{s.label}</span>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground font-medium border-l border-border pl-3">{items.length} total</span>
                </div>
              </div>

              {/* Strategy notes */}
              {plan && (
                <div className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary" />
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Monthly Strategy</p>
                    </div>
                    {strategyNotes !== (plan.strategy_notes || '') && (
                      <Button size="sm" variant="outline" onClick={saveStrategy} disabled={savingStrategy} className="h-7 text-[11px]">
                        {savingStrategy ? 'Saving…' : 'Save'}
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={strategyNotes}
                    onChange={e => setStrategyNotes(e.target.value)}
                    placeholder="Theme of the month, campaigns, key dates…"
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[50px] border-0"
                    rows={2}
                  />
                </div>
              )}

              {loading ? (
                <div className="glass-card p-12 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-primary" />
                </div>
              ) : view === 'calendar' ? (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                  <div ref={calendarRef} className="glass-card overflow-hidden">
                    <div className="grid grid-cols-7 border-b border-border bg-card/50">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="p-3 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7">
                      {calendarDays.map((day, i) => (
                        <DayCell
                          key={i}
                          day={day}
                          dayItems={itemsByDate[day.date] || []}
                          isToday={day.date === today}
                          isPast={day.date < today && day.isCurrentMonth}
                          onAdd={(d) => { setAddDate(d); setShowAddPanel(true); }}
                          onSelect={setSelectedItem}
                          onDelete={setDeleteItem}
                        />
                      ))}
                    </div>
                  </div>
                </DndContext>
              ) : (
                /* LIST VIEW */
                <div className="glass-card overflow-hidden">
                  <div className="grid grid-cols-12 px-4 py-2.5 border-b border-border bg-card/50 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-4">Title</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Platform</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">Actions</div>
                  </div>
                  {sortedItems.length === 0 ? (
                    <div className="text-center py-16 text-sm text-muted-foreground">
                      <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                      No content scheduled this month
                    </div>
                  ) : sortedItems.map(item => {
                    const cfg = getContentTypeConfig(item.content_type);
                    const platCfg = getPlatformConfig(item.platform);
                    const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="grid grid-cols-12 px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/30 transition-colors text-left items-center group"
                      >
                        <div className="col-span-2 text-xs text-muted-foreground">
                          {item.planned_date ? new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', weekday: 'short' }) : '—'}
                        </div>
                        <div className="col-span-4 text-sm font-medium text-foreground truncate flex items-center gap-2">
                          <span>{cfg.icon}</span> {item.title}
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">{cfg.label}</div>
                        <div className="col-span-2">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded', platCfg.color)}>{platCfg.icon} {platCfg.label}</span>
                        </div>
                        <div className="col-span-1">
                          {statusCfg && <span className={cn('text-[10px] px-2 py-0.5 rounded-full', statusCfg.bgColor, statusCfg.color)}>{statusCfg.emoji}</span>}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <span onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity">
                            <Trash2 size={12} />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Unscheduled */}
              {items.filter(i => !i.planned_date).length > 0 && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} /> Unscheduled ({items.filter(i => !i.planned_date).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.filter(i => !i.planned_date).map(item => {
                      const cfg = getContentTypeConfig(item.content_type);
                      return (
                        <div key={item.id} className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors group">
                          <button onClick={() => setSelectedItem(item)} className="flex-1 min-w-0 text-left flex items-center gap-2">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded border', cfg.color)}>{cfg.icon} {cfg.label}</span>
                            <span className="text-xs text-foreground truncate">{item.title}</span>
                          </button>
                          <button onClick={() => setDeleteItem(item)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>

      {showAddPanel && plan && selectedClientId && (
        <ContentItemPanel
          clientId={selectedClientId}
          planId={plan.id}
          defaultDate={addDate}
          onSave={handleAddItem}
          onClose={() => setShowAddPanel(false)}
        />
      )}

      {selectedItem && (
        <ContentItemDetail
          item={selectedItem}
          onUpdate={handleUpdateItem}
          onClose={() => { setSelectedItem(null); fetchPlanAndItems(); }}
          onDelete={(item) => { setSelectedItem(null); setDeleteItem(item); }}
        />
      )}

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

/* --------------- Calendar cell with droppable + draggable items --------------- */

function DayCell({
  day, dayItems, isToday, isPast, onAdd, onSelect, onDelete,
}: {
  day: { date: string; day: number; isCurrentMonth: boolean };
  dayItems: ContentItem[];
  isToday: boolean;
  isPast: boolean;
  onAdd: (date: string) => void;
  onSelect: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.date });
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? dayItems : dayItems.slice(0, 3);
  const overflow = dayItems.length - 3;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] border-b border-r border-border/40 p-1.5 relative group transition-colors',
        !day.isCurrentMonth && 'opacity-30 bg-muted/5',
        isToday && 'bg-primary/5 ring-1 ring-inset ring-primary/30',
        isPast && day.isCurrentMonth && 'bg-muted/5',
        isOver && 'bg-primary/10 ring-2 ring-inset ring-primary',
      )}
    >
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <span className={cn(
          'text-xs font-semibold leading-none',
          isToday
            ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center'
            : isPast ? 'text-muted-foreground/60' : 'text-foreground'
        )}>
          {day.day}
        </span>
        {day.isCurrentMonth && (
          <button
            onClick={() => onAdd(day.date)}
            className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      <div className="space-y-1">
        {visible.map(item => (
          <DraggableItem key={item.id} item={item} onSelect={onSelect} onDelete={onDelete} />
        ))}
        {!showAll && overflow > 0 && (
          <button onClick={() => setShowAll(true)} className="text-[10px] text-primary font-semibold pl-1 hover:underline">
            +{overflow} more
          </button>
        )}
        {showAll && dayItems.length > 3 && (
          <button onClick={() => setShowAll(false)} className="text-[10px] text-muted-foreground font-medium pl-1 hover:text-foreground">
            show less
          </button>
        )}
      </div>
    </div>
  );
}

function DraggableItem({ item, onSelect, onDelete }: {
  item: ContentItem;
  onSelect: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const cfg = getContentTypeConfig(item.content_type);
  const platCfg = getPlatformConfig(item.platform);
  const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];

  return (
    <div ref={setNodeRef} className={cn('group/item relative', isDragging && 'opacity-30')}>
      <div
        {...listeners}
        {...attributes}
        className={cn(
          'w-full text-left px-1.5 py-1 rounded-md text-[10px] font-medium border cursor-grab active:cursor-grabbing transition-all hover:scale-[1.02] hover:shadow-md flex items-center gap-1',
          cfg.color,
          item.status === 'published' && 'opacity-60',
          item.status === 'cancelled' && 'line-through opacity-30',
        )}
        onClick={(e) => {
          // Click to open detail (but only if not dragging)
          if (!isDragging) {
            e.preventDefault();
            onSelect(item);
          }
        }}
      >
        <span>{cfg.icon}</span>
        <span className="truncate flex-1">{item.title}</span>
        <span className="text-[8px] opacity-60">{platCfg.icon}</span>
        {statusCfg && item.status !== 'planned' && <span className="opacity-70">{statusCfg.emoji}</span>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(item); }}
        className="absolute right-0 top-0 h-full px-1 flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity bg-card/80 rounded-r-md"
      >
        <Trash2 size={9} className="text-destructive/70 hover:text-destructive" />
      </button>
    </div>
  );
}

function getMonthName(m: number) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1];
}

function toISODate(d: Date): string {
  // Local timezone safe ISO date (YYYY-MM-DD)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
