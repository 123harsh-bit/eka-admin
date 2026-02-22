// Single source of truth for all status labels, colors, and emojis

export type VideoStatus = 'idea' | 'scripting' | 'shooting' | 'editing' | 'internal_review' | 'client_review' | 'revisions' | 'approved' | 'ready_to_upload' | 'live';
export type DesignTaskStatus = 'briefed' | 'in_progress' | 'review' | 'revisions' | 'approved' | 'delivered';
export type WritingTaskStatus = 'briefed' | 'drafting' | 'review' | 'revisions' | 'approved' | 'delivered';

interface StatusConfig {
  label: string;
  clientLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export const VIDEO_STATUSES: Record<VideoStatus, StatusConfig> = {
  idea: { label: 'Idea', clientLabel: 'Planning', emoji: '💡', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  scripting: { label: 'Scripting', clientLabel: 'Writing Script', emoji: '📝', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  shooting: { label: 'Shooting', clientLabel: 'Filming', emoji: '🎬', color: 'text-primary', bgColor: 'bg-primary/20' },
  editing: { label: 'Editing', clientLabel: 'Editing', emoji: '✂️', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  internal_review: { label: 'Internal Review', clientLabel: 'Being Reviewed Internally', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  client_review: { label: 'Client Review', clientLabel: 'Ready for Your Review', emoji: '👀', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  revisions: { label: 'Revisions', clientLabel: 'Revisions in Progress', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20' },
  approved: { label: 'Approved', clientLabel: 'Approved by You', emoji: '✅', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  ready_to_upload: { label: 'Ready to Upload', clientLabel: 'Preparing to Publish', emoji: '⏳', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  live: { label: 'Live', clientLabel: 'Live!', emoji: '🟢', color: 'text-success', bgColor: 'bg-success/20' },
};

export const DESIGN_TASK_STATUSES: Record<DesignTaskStatus, StatusConfig> = {
  briefed: { label: 'Briefed', clientLabel: 'Briefed', emoji: '📋', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  in_progress: { label: 'In Progress', clientLabel: 'In Progress', emoji: '🎨', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  review: { label: 'In Review', clientLabel: 'Under Review', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  revisions: { label: 'Revisions', clientLabel: 'Revisions', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20' },
  approved: { label: 'Approved', clientLabel: 'Approved', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20' },
  delivered: { label: 'Delivered', clientLabel: 'Delivered', emoji: '📦', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

export const WRITING_TASK_STATUSES: Record<WritingTaskStatus, StatusConfig> = {
  briefed: { label: 'Briefed', clientLabel: 'Briefed', emoji: '📋', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  drafting: { label: 'Drafting', clientLabel: 'Writing in Progress', emoji: '✍️', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  review: { label: 'In Review', clientLabel: 'Under Review', emoji: '🔍', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  revisions: { label: 'Revisions', clientLabel: 'Revisions', emoji: '✏️', color: 'text-warning', bgColor: 'bg-warning/20' },
  approved: { label: 'Approved', clientLabel: 'Approved', emoji: '✅', color: 'text-success', bgColor: 'bg-success/20' },
  delivered: { label: 'Delivered', clientLabel: 'Delivered', emoji: '📦', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

export const VIDEO_STATUS_ORDER: VideoStatus[] = [
  'idea', 'scripting', 'shooting', 'editing', 'internal_review',
  'client_review', 'revisions', 'approved', 'ready_to_upload', 'live'
];

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
  { value: 'blog', label: 'Blog Post' },
  { value: 'email', label: 'Email Newsletter' },
  { value: 'bio', label: 'Bio/About' },
  { value: 'other', label: 'Other' },
];

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
