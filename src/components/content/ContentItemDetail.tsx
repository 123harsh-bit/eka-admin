import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getContentTypeConfig, getPlatformConfig, CONTENT_ITEM_STATUSES } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ContentItem } from '@/lib/contentTypes';

interface LinkedTask {
  id: string;
  title: string;
  status: string;
  type: 'video' | 'writing' | 'design';
}

interface Props {
  item: ContentItem;
  onUpdate: (id: string, updates: Partial<ContentItem>) => Promise<void>;
  onClose: () => void;
  onDelete?: (item: ContentItem) => void;
}

export function ContentItemDetail({ item, onUpdate, onClose, onDelete }: Props) {
  const { toast } = useToast();
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [publishUrl, setPublishUrl] = useState(item.published_url || '');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => { fetchLinkedTasks(); }, [item]);

  const fetchLinkedTasks = async () => {
    const tasks: LinkedTask[] = [];
    if (item.linked_video_id) {
      const { data } = await supabase.from('videos').select('id, title, status').eq('id', item.linked_video_id).single();
      if (data) tasks.push({ ...data, type: 'video' });
    }
    if (item.linked_writing_task_id) {
      const { data } = await supabase.from('writing_tasks').select('id, title, status').eq('id', item.linked_writing_task_id).single();
      if (data) tasks.push({ ...data, type: 'writing' });
    }
    if (item.linked_design_task_id) {
      const { data } = await supabase.from('design_tasks').select('id, title, status').eq('id', item.linked_design_task_id).single();
      if (data) tasks.push({ ...data, type: 'design' });
    }
    setLinkedTasks(tasks);
  };

  const markPublished = async () => {
    setPublishing(true);
    await onUpdate(item.id, { status: 'published', published_url: publishUrl || null });
    setPublishing(false);
    toast({ title: '🟢 Marked as published!' });
    onClose();
  };

  const typeCfg = getContentTypeConfig(item.content_type);
  const platCfg = getPlatformConfig(item.platform);
  const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];

  const taskIcon = (type: string) => type === 'video' ? '📹' : type === 'writing' ? '✍️' : '🎨';
  const taskRoute = (type: string) => type === 'video' ? '/admin/videos' : type === 'writing' ? '/admin/writing-tasks' : '/admin/design-tasks';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{typeCfg.icon}</span>
            <h2 className="text-sm font-semibold text-foreground truncate">{item.title}</h2>
          </div>
          <div className="flex items-center gap-1">
            {onDelete && (
              <button onClick={() => onDelete(item)} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 size={14} />
              </button>
            )}
            <button onClick={onClose} className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('text-[11px] px-2 py-0.5 rounded border', typeCfg.color)}>{typeCfg.label}</span>
            <span className={cn('text-[11px] px-2 py-0.5 rounded', platCfg.color)}>{platCfg.icon} {platCfg.label}</span>
            {statusCfg && <span className={cn('text-[11px] px-2 py-0.5 rounded-full', statusCfg.bgColor, statusCfg.color)}>{statusCfg.emoji} {statusCfg.label}</span>}
          </div>

          {item.planned_date && (
            <p className="text-xs text-muted-foreground">📅 {new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          )}

          {item.caption_brief && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Caption Brief</p>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{item.caption_brief}</p>
            </div>
          )}

          {item.visual_brief && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Visual Brief</p>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{item.visual_brief}</p>
            </div>
          )}

          {item.hashtags && (
            <p className="text-xs text-primary">{item.hashtags}</p>
          )}

          {item.reference_url && (
            <a href={item.reference_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink size={10} /> Reference
            </a>
          )}

          {/* Linked Production */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Linked Tasks</p>
            {linkedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No linked tasks</p>
            ) : (
              <div className="space-y-1.5">
                {linkedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{taskIcon(task.type)}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{task.status.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <a href={taskRoute(task.type)} className="text-[10px] text-primary hover:underline">Open →</a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish */}
          {item.status !== 'published' && item.status !== 'cancelled' && (
            <div className="space-y-2 pt-3 border-t border-border">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Mark as Published</p>
              <input
                value={publishUrl}
                onChange={e => setPublishUrl(e.target.value)}
                placeholder="Paste published URL..."
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button onClick={markPublished} disabled={publishing} className="w-full text-xs" size="sm">
                {publishing ? <Loader2 size={12} className="animate-spin" /> : '🟢'} Mark Published
              </Button>
            </div>
          )}

          {item.published_url && (
            <a href={item.published_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg bg-success/10 border border-success/20 text-success text-xs hover:bg-success/15 transition-colors">
              <ExternalLink size={12} /> View Published →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}