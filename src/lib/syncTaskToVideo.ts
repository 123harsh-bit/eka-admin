import { supabase } from '@/integrations/supabase/client';

/**
 * Maps writing task status changes to video status updates.
 * When a writing task status changes and it's linked to a video,
 * update the video status to match the pipeline stage.
 */
const WRITING_TO_VIDEO_STATUS: Record<string, string> = {
  briefed: 'scripting',
  in_progress: 'scripting',
  review: 'script_submitted',
  client_review: 'script_client_review',
  revisions: 'scripting',
  approved: 'script_approved',
};

/**
 * Sync a writing task's status change to its linked video.
 * Only syncs if the video is currently in a scripting-related stage.
 */
export async function syncWritingTaskToVideo(videoId: string | null, newTaskStatus: string) {
  if (!videoId) return;
  const targetVideoStatus = WRITING_TO_VIDEO_STATUS[newTaskStatus];
  if (!targetVideoStatus) return;

  // Only update video if it's currently in a scripting-related stage
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
 * Called when admin changes video status directly in Videos section.
 */
const VIDEO_TO_WRITING_STATUS: Record<string, string> = {
  scripting: 'in_progress',
  script_submitted: 'review',
  script_client_review: 'client_review',
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
