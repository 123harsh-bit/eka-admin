import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  getContentTypeConfig,
  getPlatformConfig,
  CONTENT_ITEM_STATUSES,
  PLATFORM_CAPTION_LIMITS,
  getAutoCreateTasks,
} from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2, Trash2, FileText, Palette, Film, LayoutDashboard, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ContentItem } from '@/lib/contentTypes';

interface LinkedTask {
  id: string;
  title: string;
  status: string;
  type: 'video' | 'writing' | 'design';
  doc_link?: string | null;
  drive_link?: string | null;
  figma_link?: string | null;
  assigned_editor?: string | null;
  assigned_camera_operator?: string | null;
}

interface Props {
  item: ContentItem;
  onUpdate: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  onClose: () => void;
  onDelete?: (item: ContentItem) => void;
}

type Tab = 'overview' | 'script' | 'design' | 'production';

export function ContentItemDetail({ item, onUpdate, onClose, onDelete }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Editable fields
  const [title, setTitle] = useState(item.title);
  const [plannedDate, setPlannedDate] = useState(item.planned_date || '');
  const [caption, setCaption] = useState(item.caption_brief || '');
  const [hashtags, setHashtags] = useState(item.hashtags || '');
  const [visualBrief, setVisualBrief] = useState(item.visual_brief || '');
  const [status, setStatus] = useState(item.status);
  const [publishUrl, setPublishUrl] = useState(item.published_url || '');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const captionLimit = PLATFORM_CAPTION_LIMITS[item.platform] || 2200;
  const captionOver = caption.length > captionLimit;

  useEffect(() => { fetchLinkedTasks(); }, [item.id]);

  const fetchLinkedTasks = async () => {
    setLoading(true);
    const tasks: LinkedTask[] = [];
    if (item.linked_video_id) {
      const { data } = await supabase.from('videos')
        .select('id, title, status, drive_link, assigned_editor, assigned_camera_operator')
        .eq('id', item.linked_video_id).maybeSingle();
      if (data) tasks.push({ ...data, type: 'video' });
    }
    if (item.linked_writing_task_id) {
      const { data } = await supabase.from('writing_tasks')
        .select('id, title, status, doc_link')
        .eq('id', item.linked_writing_task_id).maybeSingle();
      if (data) tasks.push({ ...data, type: 'writing' });
    }
    if (item.linked_design_task_id) {
      const { data } = await supabase.from('design_tasks')
        .select('id, title, status, drive_link, figma_link')
        .eq('id', item.linked_design_task_id).maybeSingle();
      if (data) tasks.push({ ...data, type: 'design' });
    }
    setLinkedTasks(tasks);
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    await onUpdate(item.id, {
      title,
      planned_date: plannedDate || null,
      caption_brief: caption || null,
      hashtags: hashtags || null,
      visual_brief: visualBrief || null,
      status,
      published_url: publishUrl || null,
    });
    setSaving(false);
    toast({ title: '✓ Saved' });
  };

  const createTask = async (kind: 'video' | 'writing' | 'design') => {
    setCreating(kind);
    const auto = getAutoCreateTasks(item.content_type);
    let newId: string | null = null;
    let updateField: keyof ContentItem | null = null;

    if (kind === 'video') {
      const { data } = await supabase.from('videos').insert({
        client_id: item.client_id,
        title: item.title,
        status: 'idea',
        date_planned: item.planned_date || null,
      }).select('id').single();
      newId = data?.id || null;
      updateField = 'linked_video_id';
    } else if (kind === 'writing') {
      const { data } = await supabase.from('writing_tasks').insert({
        client_id: item.client_id,
        title: `${item.title} — ${auto.writingType === 'ad_copy' ? 'Ad Copy' : auto.writingType?.includes('script') ? 'Script' : 'Caption'}`,
        task_type: auto.writingType || 'caption',
        status: 'briefed',
        due_date: item.planned_date || null,
        video_id: item.linked_video_id || null,
      }).select('id').single();
      newId = data?.id || null;
      updateField = 'linked_writing_task_id';
    } else if (kind === 'design') {
      const { data } = await supabase.from('design_tasks').insert({
        client_id: item.client_id,
        title: `${item.title} — ${auto.designType === 'thumbnail' ? 'Thumbnail' : 'Graphic'}`,
        task_type: auto.designType || 'social_graphic',
        status: 'briefed',
        due_date: item.planned_date || null,
        video_id: item.linked_video_id || null,
      }).select('id').single();
      newId = data?.id || null;
      updateField = 'linked_design_task_id';
    }
    if (newId && updateField) {
      await supabase.from('content_items').update({ [updateField]: newId }).eq('id', item.id);
      toast({ title: `✅ ${kind} task created` });
      await fetchLinkedTasks();
      // refresh parent state via update callback (no-op fields)
      await onUpdate(item.id, { [updateField]: newId } as Partial<ContentItem>);
    }
    setCreating(null);
  };

  const typeCfg = getContentTypeConfig(item.content_type);
  const platCfg = getPlatformConfig(item.platform);
  const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];
  const videoTask = linkedTasks.find(t => t.type === 'video');
  const writingTask = linkedTasks.find(t => t.type === 'writing');
  const designTask = linkedTasks.find(t => t.type === 'design');

  const tabs: { id: Tab; label: string; icon: typeof FileText; badge?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'script', label: 'Script', icon: FileText, badge: !!writingTask },
    { id: 'design', label: 'Design', icon: Palette, badge: !!designTask },
    { id: 'production', label: 'Production', icon: Film, badge: !!videoTask },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md p-4 border-b border-border z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xl">{typeCfg.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{typeCfg.label} · {platCfg.label}</p>
                <h2 className="text-sm font-bold text-foreground truncate">{item.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDelete && (
                <button onClick={() => onDelete(item)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={15} />
                </button>
              )}
              <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tab strip */}
          <div className="flex gap-1 -mb-px">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-colors relative',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <t.icon size={12} />
                {t.label}
                {t.badge && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <>
              <Field label="Title">
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
              </Field>

              <Field label="Status">
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(CONTENT_ITEM_STATUSES).map(([k, cfg]) => (
                    <button
                      key={k}
                      onClick={() => setStatus(k)}
                      className={cn(
                        'text-[11px] px-2.5 py-1 rounded-full border transition-all',
                        status === k
                          ? `${cfg.bgColor} ${cfg.color} border-current font-semibold`
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Scheduled Date">
                <input type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className={inputCls} />
              </Field>

              <Field label={`Caption Draft  ·  ${caption.length}/${captionLimit}`}>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder={`What goes in the ${platCfg.label} post...`}
                  rows={5}
                  className={cn(inputCls, 'resize-none', captionOver && 'border-destructive')}
                />
                {captionOver && <p className="text-[10px] text-destructive mt-1">Over {platCfg.label} limit by {caption.length - captionLimit}</p>}
              </Field>

              <Field label="Hashtags">
                <input value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#brand #campaign" className={inputCls} />
              </Field>

              {status === 'published' || publishUrl ? (
                <Field label="Published URL">
                  <input value={publishUrl} onChange={e => setPublishUrl(e.target.value)} placeholder="https://..." className={inputCls} />
                </Field>
              ) : null}

              <Button onClick={saveAll} disabled={saving} className="w-full gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </Button>
            </>
          )}

          {/* SCRIPT TAB */}
          {tab === 'script' && (
            <TaskTabContent
              task={writingTask}
              kind="writing"
              creating={creating === 'writing'}
              onCreate={() => createTask('writing')}
              loading={loading}
              extra={
                <>
                  <Field label="Visual / Script Brief">
                    <textarea value={visualBrief} onChange={e => setVisualBrief(e.target.value)} rows={4} className={cn(inputCls, 'resize-none')} placeholder="Hook, key points, CTA..." />
                  </Field>
                  <Button onClick={saveAll} disabled={saving} variant="outline" size="sm" className="w-full gap-2">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Save Brief
                  </Button>
                </>
              }
            />
          )}

          {/* DESIGN TAB */}
          {tab === 'design' && (
            <TaskTabContent
              task={designTask}
              kind="design"
              creating={creating === 'design'}
              onCreate={() => createTask('design')}
              loading={loading}
            />
          )}

          {/* PRODUCTION TAB */}
          {tab === 'production' && (
            <TaskTabContent
              task={videoTask}
              kind="video"
              creating={creating === 'video'}
              onCreate={() => createTask('video')}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function TaskTabContent({ task, kind, creating, onCreate, loading, extra }: {
  task: LinkedTask | undefined;
  kind: 'video' | 'writing' | 'design';
  creating: boolean;
  onCreate: () => void;
  loading: boolean;
  extra?: React.ReactNode;
}) {
  const route = kind === 'video' ? '/admin/videos' : kind === 'writing' ? '/admin/writing-tasks' : '/admin/design-tasks';
  const label = kind === 'video' ? 'Video' : kind === 'writing' ? 'Writing Task' : 'Design Task';
  const icon = kind === 'video' ? '🎬' : kind === 'writing' ? '✍️' : '🎨';

  if (loading) return <div className="py-8 text-center"><Loader2 size={16} className="animate-spin mx-auto text-muted-foreground" /></div>;

  if (!task) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20">
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-sm font-semibold text-foreground mb-1">No {label.toLowerCase()} yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create one and it'll be linked to this content item.</p>
          <Button onClick={onCreate} disabled={creating} size="sm" className="gap-1.5">
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create {label}
          </Button>
        </div>
        {extra}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-sm font-semibold text-foreground truncate">{task.title}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary capitalize whitespace-nowrap">
            {task.status.replace(/_/g, ' ')}
          </span>
        </div>

        {(task.doc_link || task.drive_link || task.figma_link) && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
            {task.doc_link && <LinkChip href={task.doc_link} label="Doc" />}
            {task.drive_link && <LinkChip href={task.drive_link} label="Drive" />}
            {task.figma_link && <LinkChip href={task.figma_link} label="Figma" />}
          </div>
        )}

        <a href={route} className="block text-center text-[11px] font-semibold text-primary hover:underline pt-1">
          Open in {label} board →
        </a>
      </div>
      {extra}
    </div>
  );
}

function LinkChip({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-card border border-border text-foreground hover:border-primary/40 hover:text-primary transition-colors">
      <ExternalLink size={9} /> {label}
    </a>
  );
}
