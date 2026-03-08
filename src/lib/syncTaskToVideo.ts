import { supabase } from '@/integrations/supabase/client';

/**
 * Maps writing task status changes to video status updates.
 * Writing task statuses: briefed, drafting, review, revisions, approved, delivered
 * Video statuses: idea, scripting, script_submitted, script_client_review, script_approved, ...
 */
const WRITING_TO_VIDEO_STATUS: Record<string, string> = {
  briefed: 'scripting',
  drafting: 'scripting',
  review: 'script_submitted',
  revisions: 'scripting',
  approved: 'script_approved',
  delivered: 'script_approved',
};

/**
 * Sync a writing task's status change to its linked video.
 * Only syncs if the video is currently in a scripting-related stage.
 */
export async function syncWritingTaskToVideo(videoId: string | null, newTaskStatus: string) {
  if (!videoId) return;
  const targetVideoStatus = WRITING_TO_VIDEO_STATUS[newTaskStatus];
  if (!targetVideoStatus) return;

  const scriptingStages = ['idea', 'scripting', 'script_submitted', 'script_client_review', 'script_approved'];
  const { data: video } = await supabase
    .from('videos')
    .select('status')
    .eq('id', videoId)
    .single();

  if (!video || !scriptingStages.includes(video.status)) return;

  await supabase.from('videos').update({ status: targetVideoStatus }).eq('id', videoId);
}

/**
 * Sync video status change back to linked writing task.
 */
const VIDEO_TO_WRITING_STATUS: Record<string, string> = {
  scripting: 'drafting',
  script_submitted: 'review',
  script_approved: 'approved',
};

export async function syncVideoToWritingTask(videoId: string, newVideoStatus: string) {
  const targetTaskStatus = VIDEO_TO_WRITING_STATUS[newVideoStatus];
  if (!targetTaskStatus) return;

  await supabase
    .from('writing_tasks')
    .update({ status: targetTaskStatus })
    .eq('video_id', videoId);
}
