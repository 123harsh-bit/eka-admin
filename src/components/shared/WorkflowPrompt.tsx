import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VIDEO_STATUS_ORDER, VIDEO_STATUSES, type VideoStatus } from '@/lib/statusConfig';
import { cn } from '@/lib/utils';
import { ExternalLink, Send, Loader2, Download } from 'lucide-react';

interface WorkflowPromptProps {
  video: {
    id: string;
    title: string;
    status: string;
    client_name?: string;
    assigned_editor?: string | null;
    assigned_camera_operator?: string | null;
    raw_footage_link?: string | null;
    drive_link?: string | null;
    live_url?: string | null;
    editor_name?: string | null;
    camera_op_name?: string | null;
    writer_name?: string | null;
    shoot_date?: string | null;
  };
  onAction?: (action: string, data?: Record<string, unknown>) => void;
  loading?: boolean;
}

const BORDER_COLORS: Record<string, string> = {
  admin: 'border-l-primary',      // purple - needs admin action
  team: 'border-l-blue-400',      // blue - waiting for team  
  client: 'border-l-pink-400',    // pink - waiting for client
  complete: 'border-l-success',   // green - complete
};

export function WorkflowPrompt({ video, onAction, loading }: WorkflowPromptProps) {
  const [liveUrl, setLiveUrl] = useState('');
  const stageIdx = VIDEO_STATUS_ORDER.indexOf(video.status as VideoStatus);
  const stageNum = stageIdx + 1;
  const totalStages = VIDEO_STATUS_ORDER.length;

  const getStageConfig = () => {
    switch (video.status) {
      case 'idea':
        return {
          border: BORDER_COLORS.admin,
          title: 'IDEA CREATED',
          message: '✅ Video idea saved! Next: Assign a script writer to begin writing the script.',
          actions: [
            { label: 'Assign Writer Now →', action: 'assign_writer', primary: true },
            { label: 'Later', action: 'dismiss', primary: false },
          ],
        };
      case 'scripting':
        return {
          border: BORDER_COLORS.team,
          title: 'SCRIPTING',
          message: `⏳ Waiting for ${video.writer_name || 'writer'} to submit script`,
          actions: [
            { label: 'Send Reminder to Writer', action: 'remind_writer', primary: false },
          ],
        };
      case 'script_submitted':
        return {
          border: BORDER_COLORS.admin,
          title: 'SCRIPT SUBMITTED',
          message: `📝 ${video.writer_name || 'Writer'} submitted the script`,
          actions: [
            { label: '✅ Send to Client for Approval', action: 'send_script_to_client', primary: true },
            { label: '✏️ Request Changes from Writer', action: 'request_script_changes', primary: false },
          ],
          links: video.drive_link ? [{ label: '📥 Download Script', url: video.drive_link }] : [],
        };
      case 'script_client_review':
        return {
          border: BORDER_COLORS.client,
          title: 'SCRIPT — CLIENT REVIEW',
          message: `👀 Waiting for ${video.client_name || 'client'} to approve the script`,
          actions: [],
        };
      case 'script_approved':
        return {
          border: BORDER_COLORS.admin,
          title: 'SCRIPT APPROVED BY CLIENT',
          message: `✅ ${video.client_name || 'Client'} approved the script! Next: Assign a camera operator to schedule the shoot.`,
          actions: [
            { label: 'Assign Camera Operator Now →', action: 'assign_camera_op', primary: true },
            { label: 'Later', action: 'dismiss', primary: false },
          ],
        };
      case 'shoot_assigned':
        return {
          border: BORDER_COLORS.team,
          title: 'SHOOT ASSIGNED',
          message: `🎬 Waiting for ${video.camera_op_name || 'camera operator'} to start filming${video.shoot_date ? ` on ${new Date(video.shoot_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}`,
          actions: [
            { label: 'Send Reminder', action: 'remind_camera_op', primary: false },
          ],
        };
      case 'shooting':
        return {
          border: BORDER_COLORS.team,
          title: 'FILMING IN PROGRESS',
          message: `🎥 ${video.camera_op_name || 'Camera operator'} is filming. Waiting for footage upload.`,
          actions: [],
        };
      case 'footage_delivered':
        return {
          border: BORDER_COLORS.admin,
          title: 'FOOTAGE DELIVERED',
          message: `📁 ${video.camera_op_name || 'Camera operator'} uploaded raw footage. Next: Assign an editor.`,
          actions: [
            { label: 'Assign Editor Now →', action: 'assign_editor', primary: true },
            { label: 'Later', action: 'dismiss', primary: false },
          ],
          links: video.raw_footage_link ? [{ label: '📂 Open Raw Footage →', url: video.raw_footage_link }] : [],
        };
      case 'editing':
        return {
          border: BORDER_COLORS.team,
          title: 'EDITING',
          message: `✂️ Waiting for ${video.editor_name || 'editor'} to submit the edit`,
          actions: [
            { label: 'Send Reminder', action: 'remind_editor', primary: false },
          ],
        };
      case 'internal_review':
        return {
          border: BORDER_COLORS.admin,
          title: 'INTERNAL REVIEW',
          message: `🔍 ${video.editor_name || 'Editor'} submitted the edit. Review and send to client.`,
          actions: [
            { label: '✅ Send to Client', action: 'send_to_client', primary: true },
            { label: '✏️ Request Revisions', action: 'request_editor_revisions', primary: false },
          ],
          links: video.drive_link ? [{ label: '📥 Watch Edit →', url: video.drive_link }] : [],
        };
      case 'client_review':
        return {
          border: BORDER_COLORS.client,
          title: 'CLIENT REVIEW',
          message: `👀 Waiting for ${video.client_name || 'client'} to review the video`,
          actions: [],
        };
      case 'revisions':
        return {
          border: BORDER_COLORS.team,
          title: 'REVISIONS',
          message: `✏️ ${video.client_name || 'Client'} requested changes. Waiting for editor.`,
          actions: [
            { label: 'Send Reminder to Editor', action: 'remind_editor', primary: false },
          ],
        };
      case 'approved':
        return {
          border: BORDER_COLORS.admin,
          title: 'APPROVED BY CLIENT',
          message: `✅ ${video.client_name || 'Client'} approved the final video! Paste the published URL to mark as live.`,
          actions: [],
          showLiveUrl: true,
        };
      case 'ready_to_upload':
        return {
          border: BORDER_COLORS.admin,
          title: 'READY TO UPLOAD',
          message: 'Video is ready. Upload and paste the live URL.',
          actions: [],
          showLiveUrl: true,
        };
      case 'live':
        return {
          border: BORDER_COLORS.complete,
          title: '🟢 LIVE!',
          message: 'This video is published and live.',
          actions: [],
          links: video.live_url ? [{ label: '🔗 Watch Live', url: video.live_url }] : [],
        };
      default:
        return { border: 'border-l-muted', title: video.status, message: '', actions: [] };
    }
  };

  const config = getStageConfig();

  return (
    <div className={cn('border-l-4 rounded-lg bg-muted/20 p-4 space-y-3', config.border)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Stage {stageNum} of {totalStages} — {config.title}
        </p>
      </div>

      <p className="text-sm text-foreground">{config.message}</p>

      {/* Links */}
      {'links' in config && config.links && config.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.links.map((link: { label: string; url: string }, i: number) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors">
              <Download size={12} /> {link.label}
            </a>
          ))}
        </div>
      )}

      {/* Live URL input */}
      {'showLiveUrl' in config && config.showLiveUrl && (
        <div className="space-y-2">
          <Input
            value={liveUrl}
            onChange={e => setLiveUrl(e.target.value)}
            placeholder="https://youtube.com/..."
            className="text-sm"
          />
          <Button
            onClick={() => onAction?.('mark_live', { live_url: liveUrl })}
            disabled={!liveUrl.trim() || loading}
            className="w-full gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            🟢 Mark as Live
          </Button>
        </div>
      )}

      {/* Action buttons */}
      {config.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {config.actions.map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant={action.primary ? 'default' : 'outline'}
              onClick={() => onAction?.(action.action)}
              disabled={loading}
              className={cn(
                'gap-1.5 text-xs',
                action.primary && 'animate-pulse-subtle'
              )}
            >
              {loading && action.primary && <Loader2 size={12} className="animate-spin" />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
