import { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Edit2, Calendar, Download, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Client {
  id: string;
  name: string;
  logo_url: string | null;
}

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
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [strategyNotes, setStrategyNotes] = useState('');
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ContentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    if (deleteItem.linked_video_id) await supabase.from('videos').delete().eq('id', deleteItem.linked_video_id);
    if (deleteItem.linked_writing_task_id) await supabase.from('writing_tasks').delete().eq('id', deleteItem.linked_writing_task_id);
    if (deleteItem.linked_design_task_id) await supabase.from('design_tasks').delete().eq('id', deleteItem.linked_design_task_id);
    await supabase.from('content_items').delete().eq('id', deleteItem.id);
    setDeleting(false);
    setDeleteItem(null);
    toast({ title: '🗑️ Deleted', description: 'Content item and linked tasks removed' });
    fetchPlanAndItems();
  };

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#0a0b0f',
        scale: 2,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Header
      pdf.setFillColor(10, 11, 15);
      pdf.rect(0, 0, pdfWidth, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const clientName = clients.find(c => c.id === selectedClientId)?.name || '';
      pdf.text(`${clientName} — ${getMonthName(month)} ${year} Content Plan`, 10, 12);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generated by Eka Creative Agency`, pdfWidth - 10, 12, { align: 'right' });

      pdf.addImage(imgData, 'PNG', 0, 20, pdfWidth, pdfHeight);
      pdf.save(`${clientName}_${getMonthName(month)}_${year}_Content_Plan.pdf`);
      toast({ title: '📄 PDF exported!' });
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

  // Calendar grid computation
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
      const date = new Date(year, month - 1, d);
      days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: true });
    }
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(year, month, d);
        days.push({ date: date.toISOString().split('T')[0], day: d, isCurrentMonth: false });
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
  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Stats
  const statusCounts = useMemo(() => {
    const counts = { planned: 0, in_production: 0, ready: 0, published: 0, cancelled: 0 };
    items.forEach(i => { if (counts[i.status as keyof typeof counts] !== undefined) counts[i.status as keyof typeof counts]++; });
    return counts;
  }, [items]);

  return (
    <AdminLayout>
      <PullToRefresh onRefresh={fetchPlanAndItems}>
        <div className="space-y-5 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Content Planner</h1>
              <p className="text-sm text-muted-foreground">Plan, visualize, and export your content calendar</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1.5" disabled={exporting || items.length === 0}>
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Export PDF
              </Button>
              <Button onClick={() => { setAddDate(null); setShowAddPanel(true); }} size="sm" className="gap-1.5">
                <Plus size={14} /> Add Content
              </Button>
            </div>
          </div>

          {/* Client selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border',
                  selectedClientId === c.id
                    ? 'bg-primary/15 border-primary/40 text-primary shadow-lg shadow-primary/5'
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
              {/* Month navigator + stats */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigateMonth(-1)} className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="text-lg font-bold text-foreground min-w-[160px] text-center">{getMonthName(month)} {year}</h2>
                  <button onClick={() => navigateMonth(1)} className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
                    <ChevronRight size={16} />
                  </button>
                  <button onClick={goToThisMonth} className="text-[11px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold">
                    Today
                  </button>
                </div>

                {/* Mini stats */}
                <div className="flex items-center gap-3">
                  {[
                    { label: 'Planned', count: statusCounts.planned, color: 'text-muted-foreground' },
                    { label: 'In Production', count: statusCounts.in_production, color: 'text-blue-400' },
                    { label: 'Ready', count: statusCounts.ready, color: 'text-emerald-400' },
                    { label: 'Published', count: statusCounts.published, color: 'text-success' },
                  ].map(s => s.count > 0 && (
                    <div key={s.label} className="flex items-center gap-1.5 text-xs">
                      <span className={cn('h-2 w-2 rounded-full', s.color === 'text-muted-foreground' ? 'bg-muted-foreground' : s.color === 'text-blue-400' ? 'bg-blue-400' : s.color === 'text-emerald-400' ? 'bg-emerald-400' : 'bg-success')} />
                      <span className="text-muted-foreground">{s.count}</span>
                      <span className="text-muted-foreground/60 hidden sm:inline">{s.label}</span>
                    </div>
                  ))}
                  <span className="text-xs text-muted-foreground font-medium">{items.length} total</span>
                </div>
              </div>

              {/* Strategy Notes */}
              {plan && (
                <div className="glass-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-primary" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Strategy</p>
                    </div>
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

              {/* Calendar Grid */}
              {loading ? (
                <div className="glass-card p-12 text-center">
                  <Loader2 size={20} className="animate-spin mx-auto text-primary" />
                </div>
              ) : (
                <div ref={calendarRef} className="glass-card overflow-hidden">
                  {/* Day headers */}
                  <div className="grid grid-cols-7 border-b border-border bg-card/50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="p-2.5 text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
                    ))}
                  </div>

                  {/* Calendar cells */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, i) => {
                      const dayItems = itemsByDate[day.date] || [];
                      const isToday = day.date === today;
                      const isPast = day.date < today && day.isCurrentMonth;

                      return (
                        <div
                          key={i}
                          className={cn(
                            'min-h-[120px] border-b border-r border-border/40 p-1.5 relative group transition-colors',
                            !day.isCurrentMonth && 'opacity-25 bg-muted/5',
                            isToday && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
                            isPast && day.isCurrentMonth && 'bg-muted/5'
                          )}
                        >
                          {/* Day number + add button */}
                          <div className="flex items-center justify-between mb-1 px-0.5">
                            <span className={cn(
                              'text-xs font-medium leading-none',
                              isToday
                                ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold'
                                : isPast ? 'text-muted-foreground/60' : 'text-muted-foreground'
                            )}>
                              {day.day}
                            </span>
                            {day.isCurrentMonth && (
                              <button
                                onClick={() => { setAddDate(day.date); setShowAddPanel(true); }}
                                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>

                          {/* Content items */}
                          <div className="space-y-0.5">
                            {dayItems.slice(0, 3).map(item => {
                              const cfg = getContentTypeConfig(item.content_type);
                              const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];
                              return (
                                <div
                                  key={item.id}
                                  className="group/item relative"
                                >
                                  <button
                                    onClick={() => setSelectedItem(item)}
                                    className={cn(
                                      'w-full text-left px-1.5 py-1 rounded-md text-[10px] font-medium truncate border transition-all hover:scale-[1.02] hover:shadow-md',
                                      cfg.color,
                                      item.status === 'published' && 'opacity-60',
                                      item.status === 'cancelled' && 'line-through opacity-30'
                                    )}
                                  >
                                    <span className="mr-0.5">{cfg.icon}</span>
                                    {item.title}
                                    {statusCfg && item.status !== 'planned' && (
                                      <span className="ml-1 opacity-70">{statusCfg.emoji}</span>
                                    )}
                                  </button>
                                  {/* Delete on hover */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}
                                    className="absolute right-0 top-0 h-full px-1 flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                  >
                                    <Trash2 size={10} className="text-destructive/60 hover:text-destructive" />
                                  </button>
                                </div>
                              );
                            })}
                            {dayItems.length > 3 && (
                              <span className="text-[9px] text-primary font-medium pl-1 cursor-pointer hover:underline">
                                +{dayItems.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unscheduled items */}
              {items.filter(i => !i.planned_date).length > 0 && (
                <div className="glass-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={12} /> Unscheduled ({items.filter(i => !i.planned_date).length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.filter(i => !i.planned_date).map(item => {
                      const cfg = getContentTypeConfig(item.content_type);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2.5 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors group"
                        >
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

function getMonthName(m: number) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1];
}