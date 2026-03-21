import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getContentTypeConfig, getPlatformConfig, CONTENT_ITEM_STATUSES } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { X, ExternalLink, Loader2 } from 'lucide-react';
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
}

export function ContentItemDetail({ item, onUpdate, onClose }: Props) {
  const { toast } = useToast();
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [publishUrl, setPublishUrl] = useState(item.published_url || '');
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchLinkedTasks();
  }, [item]);

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

    // Notify client
    const { data: clientData } = await supabase.from('clients').select('user_id, name').eq('id', item.client_id).single();
    if (clientData?.user_id) {
      const platCfg = getPlatformConfig(item.platform);
      await supabase.from('notifications').insert({
        recipient_id: clientData.user_id,
        message: `🟢 '${item.title}' is now live on ${platCfg.label}!${publishUrl ? ' Tap to view.' : ''}`,
        type: 'content_published',
        related_client_id: item.client_id,
      });
    }

    setPublishing(false);
    toast({ title: '🟢 Marked as published!' });
    onClose();
  };

  const typeCfg = getContentTypeConfig(item.content_type);
  const platCfg = getPlatformConfig(item.platform);
  const statusCfg = CONTENT_ITEM_STATUSES[item.status as keyof typeof CONTENT_ITEM_STATUSES];

  const taskTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'writing': return '✍️';
      case 'design': return '🎨';
      default: return '📋';
    }
  };

  const taskTypeRoute = (type: string) => {
    switch (type) {
      case 'video': return '/admin/videos';
      case 'writing': return '/admin/writing-tasks';
      case 'design': return '/admin/design-tasks';
      default: return '/admin';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeCfg.icon}</span>
            <h2 className="font-display font-semibold text-foreground truncate">{item.title}</h2>
          </div>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* Status & meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs px-2.5 py-1 rounded-full border', typeCfg.color)}>{typeCfg.label}</span>
            <span className={cn('text-xs px-2.5 py-1 rounded-full', platCfg.color)}>{platCfg.icon} {platCfg.label}</span>
            {statusCfg && <span className={cn('text-xs px-2.5 py-1 rounded-full', statusCfg.bgColor, statusCfg.color)}>{statusCfg.emoji} {statusCfg.label}</span>}
          </div>

          {item.planned_date && (
            <p className="text-sm text-muted-foreground">📅 Planned for {new Date(item.planned_date + 'T00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          )}

          {/* Briefs */}
          {item.caption_brief && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Caption Brief</p>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{item.caption_brief}</p>
            </div>
          )}

          {item.visual_brief && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Visual Brief</p>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{item.visual_brief}</p>
            </div>
          )}

          {item.hashtags && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">Hashtags</p>
              <p className="text-sm text-primary">{item.hashtags}</p>
            </div>
          )}

          {item.reference_url && (
            <a href={item.reference_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
              <ExternalLink size={12} /> Reference Link
            </a>
          )}

          {/* Linked Production */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Linked Production</h3>
            {linkedTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No linked tasks</p>
            ) : (
              <div className="space-y-2">
                {linkedTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span>{taskTypeIcon(task.type)}</span>
                      <div>
                        <p className="text-xs font-medium text-foreground">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{task.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <a href={taskTypeRoute(task.type)} className="text-[10px] text-primary hover:underline">
                      Open →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish section */}
          {item.status !== 'published' && item.status !== 'cancelled' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">Mark as Published</h3>
              <input
                value={publishUrl}
                onChange={e => setPublishUrl(e.target.value)}
                placeholder="Paste published URL (Instagram, YouTube, etc.)"
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button onClick={markPublished} disabled={publishing} className="w-full gap-2" variant="default">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : '🟢'} Mark as Published
              </Button>
            </div>
          )}

          {/* Published URL */}
          {item.published_url && (
            <a href={item.published_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm hover:bg-success/15 transition-colors">
              <ExternalLink size={14} /> View Published Content →
            </a>
          )}

          {/* Visibility toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Visible to client</span>
            <button
              onClick={() => onUpdate(item.id, { is_visible_to_client: !item.is_visible_to_client })}
              className={cn(
                'h-6 w-10 rounded-full transition-colors relative',
                item.is_visible_to_client ? 'bg-primary' : 'bg-muted'
              )}
            >
              <div className={cn('h-4 w-4 rounded-full bg-white absolute top-1 transition-transform', item.is_visible_to_client ? 'translate-x-5' : 'translate-x-1')} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
