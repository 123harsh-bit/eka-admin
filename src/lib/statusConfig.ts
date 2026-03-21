// Single source of truth for all status labels, colors, and emojis

export type VideoStatus = 'idea' | 'scripting' | 'script_submitted' | 'script_client_review' | 'script_approved' | 'shoot_assigned' | 'shooting' | 'footage_delivered' | 'editing' | 'internal_review' | 'client_review' | 'revisions' | 'approved' | 'ready_to_upload' | 'live';
export type DesignTaskStatus = 'briefed' | 'in_progress' | 'review' | 'revisions' | 'approved' | 'delivered';
export type WritingTaskStatus = 'briefed' | 'drafting' | 'review' | 'revisions' | 'approved' | 'delivered';

interface StatusConfig {
  label: string;
  clientLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
  progressPct: number;
}

export const VIDEO_STATUSES: Record<VideoStatus, StatusConfig> = {
  idea: { label: 'Idea', clientLabel: "💡 Being Planned", emoji: '💡', color: 'text-muted-foreground', bgColor: 'bg-muted', progressPct: 3 },
  scripting: { label: 'Scripting', clientLabel: '📝 Script Being Written', emoji: '📝', color: 'text-blue-400', bgColor: 'bg-blue-500/20', progressPct: 10 },
  script_submitted: { label: 'Script Submitted', clientLabel: '📝 Script Under Internal Review', emoji: '📄', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', progressPct: 16 },
  script_client_review: { label: 'Script — Client Review', clientLabel: '📄 Script Ready for Your Approval ⚡️', emoji: '👀', color: 'text-pink-400', bgColor: 'bg-pink-500/20', progressPct: 22 },
  script_approved: { label: 'Script Approved', clientLabel: '✅ Script Approved — Shoot Coming!', emoji: '✅', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', progressPct: 28 },
  shoot_assigned: { label: 'Shoot Assigned', clientLabel: '🎬 Shoot Scheduled', emoji: '🎬', color: 'text-violet-400', bgColor: 'bg-violet-500/20', progressPct: 35 },
  shooting: { label: 'Shooting', clientLabel: '🎥 Being Filmed Right Now!', emoji: '🎥', color: 'text-primary', bgColor: 'bg-primary/20', progressPct: 45 },
  footage_delivered: { label: 'Footage Delivered', clientLabel: '📁 Footage Ready — Editing Soon', emoji: '📁', color: 'text-amber-400', bgColor: 'bg-amber-500/20', progressPct: 52 },
  editing: { label: 'Editing', clientLabel: '✂️ Being Edited', emoji: '✂️', color: 'text-orange-400', bgColor: 'bg-orange-500/20', progressPct: 62 },
  internal_review: { label: 'Internal Review', clientLabel: '🔍 Being Polished', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', progressPct: 72 },
  client_review: { label: 'Client Review', clientLabel: '👀 Ready for Your Review ⚡️', emoji: '👀', color: 'text-pink-400', bgColor: 'bg-pink-500/20', progressPct: 80 },
  revisions: { label: 'Revisions', clientLabel: '✏️ Applying Your Feedback', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20', progressPct: 85 },
  approved: { label: 'Approved', clientLabel: '✅ Approved by You!', emoji: '✅', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', progressPct: 90 },
  ready_to_upload: { label: 'Ready to Upload', clientLabel: '⏳ Almost Live...', emoji: '⏳', color: 'text-amber-400', bgColor: 'bg-amber-500/20', progressPct: 95 },
  live: { label: 'Live', clientLabel: '🟢 LIVE!', emoji: '🟢', color: 'text-success', bgColor: 'bg-success/20', progressPct: 100 },
};

export const DESIGN_TASK_STATUSES: Record<DesignTaskStatus, StatusConfig> = {
  briefed: { label: 'Briefed', clientLabel: 'Briefed', emoji: '📋', color: 'text-muted-foreground', bgColor: 'bg-muted', progressPct: 0 },
  in_progress: { label: 'In Progress', clientLabel: 'In Progress', emoji: '🎨', color: 'text-blue-400', bgColor: 'bg-blue-500/20', progressPct: 25 },
  review: { label: 'In Review', clientLabel: 'Under Review', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', progressPct: 50 },
  revisions: { label: 'Revisions', clientLabel: 'Revisions', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20', progressPct: 65 },
  approved: { label: 'Approved', clientLabel: 'Approved', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20', progressPct: 85 },
  delivered: { label: 'Delivered', clientLabel: 'Delivered', emoji: '📦', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', progressPct: 100 },
};

export const WRITING_TASK_STATUSES: Record<WritingTaskStatus, StatusConfig> = {
  briefed: { label: 'Briefed', clientLabel: 'Briefed', emoji: '📋', color: 'text-muted-foreground', bgColor: 'bg-muted', progressPct: 0 },
  drafting: { label: 'Drafting', clientLabel: 'Writing in Progress', emoji: '✍️', color: 'text-blue-400', bgColor: 'bg-blue-500/20', progressPct: 25 },
  review: { label: 'In Review', clientLabel: 'Under Review', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20', progressPct: 50 },
  revisions: { label: 'Revisions', clientLabel: 'Revisions', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20', progressPct: 65 },
  approved: { label: 'Approved', clientLabel: 'Approved', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20', progressPct: 85 },
  delivered: { label: 'Delivered', clientLabel: 'Delivered', emoji: '📦', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20', progressPct: 100 },
};

export const VIDEO_STATUS_ORDER: VideoStatus[] = [
  'idea', 'scripting', 'script_submitted', 'script_client_review', 'script_approved',
  'shoot_assigned', 'shooting', 'footage_delivered', 'editing', 'internal_review',
  'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'
];

// Editing-only clients: simplified pipeline (no scripting/shooting)
export const EDITING_ONLY_STATUS_ORDER: VideoStatus[] = [
  'idea', 'editing', 'internal_review', 'approved', 'client_review', 'ready_to_upload', 'live'
];

// Admin-facing labels for editing-only pipeline
export const EDITING_ONLY_ADMIN_LABELS: Partial<Record<VideoStatus, string>> = {
  idea: 'Not Started',
  editing: 'Editing Started',
  internal_review: 'Internal Review',
  approved: 'Internal Approved',
  client_review: 'Client Review',
  ready_to_upload: 'Client Approved',
  live: 'Delivered',
};

// Client-facing labels for editing-only pipeline
export const EDITING_ONLY_CLIENT_LABELS: Partial<Record<VideoStatus, string>> = {
  idea: '📋 Received — Not Started Yet',
  editing: '✂️ Being Edited',
  internal_review: '🔍 Quality Check',
  approved: '✅ Passed Internal Review',
  client_review: '👀 Ready for Your Review ⚡️',
  ready_to_upload: '✅ Approved by You!',
  live: '📦 Delivered!',
};

export type ClientServiceType = 'full_production' | 'editing_only';

export function getStatusOrderForClient(serviceType: ClientServiceType): VideoStatus[] {
  return serviceType === 'editing_only' ? EDITING_ONLY_STATUS_ORDER : VIDEO_STATUS_ORDER;
}

export function getClientLabel(status: VideoStatus, serviceType: ClientServiceType): string {
  if (serviceType === 'editing_only' && EDITING_ONLY_CLIENT_LABELS[status]) {
    return EDITING_ONLY_CLIENT_LABELS[status]!;
  }
  return VIDEO_STATUSES[status]?.clientLabel || status;
}

export function getAdminLabel(status: VideoStatus, serviceType: ClientServiceType): string {
  if (serviceType === 'editing_only' && EDITING_ONLY_ADMIN_LABELS[status]) {
    return EDITING_ONLY_ADMIN_LABELS[status]!;
  }
  return VIDEO_STATUSES[status]?.label || status;
}

export const DESIGN_TASK_STATUS_ORDER: DesignTaskStatus[] = [
  'briefed', 'in_progress', 'review', 'revisions', 'approved', 'delivered'
];

export const WRITING_TASK_STATUS_ORDER: WritingTaskStatus[] = [
  'briefed', 'drafting', 'review', 'revisions', 'approved', 'delivered'
];

export const DESIGN_TASK_TYPES = [
  { value: 'thumbnail', label: 'Thumbnail' },
  { value: 'social_graphic', label: 'Social Graphic' },
  { value: 'brand_kit', label: 'Brand Kit' },
  { value: 'motion_graphic', label: 'Motion Graphic' },
  { value: 'lower_third', label: 'Lower Third' },
  { value: 'banner', label: 'Banner' },
  { value: 'other', label: 'Other' },
];

export const WRITING_TASK_TYPES = [
  { value: 'reel_script', label: 'Reel Script' },
  { value: 'short_video_script', label: 'Short Video Script' },
  { value: 'long_form_script', label: 'Long Form Script' },
  { value: 'caption', label: 'Caption' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'email', label: 'Email Newsletter' },
  { value: 'bio', label: 'Bio/About' },
  { value: 'other', label: 'Other' },
];

// Content Planner types
export const CONTENT_TYPES = [
  { value: 'reel', label: 'Reel', icon: '🎬', platform: 'instagram', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'post', label: 'Post', icon: '📷', platform: 'instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'carousel', label: 'Carousel', icon: '🎠', platform: 'instagram', color: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' },
  { value: 'story', label: 'Story', icon: '📱', platform: 'instagram', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { value: 'youtube_video', label: 'YouTube Video', icon: '📺', platform: 'youtube', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'youtube_short', label: 'YouTube Short', icon: '⚡', platform: 'youtube', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'linkedin_post', label: 'LinkedIn Post', icon: '💼', platform: 'linkedin', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'facebook_post', label: 'Facebook Post', icon: '👥', platform: 'facebook', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
  { value: 'ad', label: 'Ad', icon: '📢', platform: 'multiple', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'other', label: 'Other', icon: '📌', platform: 'other', color: 'bg-muted text-muted-foreground border-border' },
] as const;

export const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram', icon: '📷', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'youtube', label: 'YouTube', icon: '📺', color: 'bg-red-500/20 text-red-400' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'facebook', label: 'Facebook', icon: '👥', color: 'bg-sky-500/20 text-sky-400' },
  { value: 'multiple', label: 'Multiple', icon: '🌐', color: 'bg-muted text-muted-foreground' },
  { value: 'other', label: 'Other', icon: '📌', color: 'bg-muted text-muted-foreground' },
] as const;

export const CONTENT_ITEM_STATUSES = {
  planned: { label: 'Planned', emoji: '📋', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  in_production: { label: 'In Production', emoji: '🔄', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  ready: { label: 'Ready', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20' },
  published: { label: 'Published', emoji: '🟢', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  cancelled: { label: 'Cancelled', emoji: '❌', color: 'text-destructive', bgColor: 'bg-destructive/20' },
} as const;

export function getContentTypeConfig(type: string) {
  return CONTENT_TYPES.find(t => t.value === type) || CONTENT_TYPES[CONTENT_TYPES.length - 1];
}

export function getPlatformConfig(platform: string) {
  return PLATFORM_OPTIONS.find(p => p.value === platform) || PLATFORM_OPTIONS[PLATFORM_OPTIONS.length - 1];
}

// What production tasks each content type auto-creates
export function getAutoCreateTasks(contentType: string): { video: boolean; writing: boolean; design: boolean; writingType?: string; designType?: string } {
  switch (contentType) {
    case 'reel':
    case 'youtube_video':
    case 'youtube_short':
      return { video: true, writing: true, design: true, writingType: 'reel_script', designType: 'thumbnail' };
    case 'post':
      return { video: false, writing: true, design: true, writingType: 'caption', designType: 'social_graphic' };
    case 'carousel':
      return { video: false, writing: true, design: true, writingType: 'caption', designType: 'social_graphic' };
    case 'linkedin_post':
    case 'facebook_post':
      return { video: false, writing: true, design: true, writingType: 'caption', designType: 'social_graphic' };
    case 'story':
      return { video: false, writing: false, design: true, designType: 'social_graphic' };
    case 'ad':
      return { video: false, writing: true, design: true, writingType: 'ad_copy', designType: 'social_graphic' };
    default:
      return { video: false, writing: false, design: false };
  }
}

// Duration formatting helpers
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}min`;
  return `${seconds}s (${mins}min ${secs}s)`;
}

export function formatDurationShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins}min`;
  return `${mins}m${secs}s`;
}

export const DURATION_PRESETS = [
  { label: '30s', value: 30 },
  { label: '45s', value: 45 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
  { label: '5min+', value: 300 },
];

// Attendance status config
export const ATTENDANCE_STATUSES = {
  on_time: { label: 'On Time', emoji: '🟢', color: 'text-success', bgColor: 'bg-success/20' },
  late: { label: 'Late', emoji: '🟡', color: 'text-warning', bgColor: 'bg-warning/20' },
  left_early: { label: 'Left Early', emoji: '🟠', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  half_day: { label: 'Half Day', emoji: '🔵', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  absent: { label: 'Absent', emoji: '🔴', color: 'text-destructive', bgColor: 'bg-destructive/20' },
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Managing Director',
  editor: 'Video Editor',
  designer: 'Graphic Designer',
  writer: 'Content Writer',
  camera_operator: 'Camera Operator',
  client: 'Client',
};

// Action required helpers for admin video table
export function getActionRequired(status: string, video: { assigned_editor?: string | null; assigned_camera_operator?: string | null; editor_name?: string | null; camera_op_name?: string | null; writer_name?: string | null; client_name?: string | null }, serviceType?: ClientServiceType) {
  // For editing-only, simplify action labels
  if (serviceType === 'editing_only') {
    switch (status) {
      case 'idea':
        return { type: 'admin' as const, label: 'Not Started', color: 'bg-muted text-muted-foreground' };
      case 'editing':
        return { type: 'team' as const, label: `Waiting for ${video.editor_name || 'Editor'}`, color: 'bg-blue-500/20 text-blue-400' };
      case 'internal_review':
      case 'approved':
        return { type: 'admin' as const, label: 'Your Action Needed', color: 'bg-primary/20 text-primary' };
      case 'client_review':
        return { type: 'client' as const, label: `Waiting for ${video.client_name || 'Client'}`, color: 'bg-pink-500/20 text-pink-400' };
      case 'ready_to_upload':
        return { type: 'admin' as const, label: 'Preparing Delivery', color: 'bg-amber-500/20 text-amber-400' };
      case 'live':
        return { type: 'done' as const, label: '✅ Delivered', color: 'bg-success/20 text-success' };
      default:
        return { type: 'admin' as const, label: 'Your Action Needed', color: 'bg-primary/20 text-primary' };
    }
  }

  switch (status) {
    case 'idea':
    case 'script_submitted':
    case 'script_approved':
    case 'footage_delivered':
    case 'internal_review':
    case 'approved':
    case 'ready_to_upload':
      return { type: 'admin' as const, label: 'Your Action Needed', color: 'bg-primary/20 text-primary' };
    case 'scripting':
      return { type: 'team' as const, label: `Waiting for ${video.writer_name || 'Writer'}`, color: 'bg-blue-500/20 text-blue-400' };
    case 'shoot_assigned':
    case 'shooting':
      return { type: 'team' as const, label: `Waiting for ${video.camera_op_name || 'Camera Op'}`, color: 'bg-blue-500/20 text-blue-400' };
    case 'editing':
    case 'revisions':
      return { type: 'team' as const, label: `Waiting for ${video.editor_name || 'Editor'}`, color: 'bg-blue-500/20 text-blue-400' };
    case 'script_client_review':
    case 'client_review':
      return { type: 'client' as const, label: `Waiting for ${video.client_name || 'Client'}`, color: 'bg-pink-500/20 text-pink-400' };
    case 'live':
      return { type: 'done' as const, label: '✅ Live', color: 'bg-success/20 text-success' };
    default:
      return { type: 'admin' as const, label: 'Unknown', color: 'bg-muted text-muted-foreground' };
  }
}
