// Moved from src/lib/syncTaskToVideo.ts
import { supabase } from '@/integrations/supabase/client';

const WRITING_TO_VIDEO_STATUS: Record<string, string> = {
  briefed: 'scripting',
  drafting: 'scripting',
  review: 'script_submitted',
  revisions: 'scripting',
  approved: 'script_approved',
  delivered: 'script_approved',
};

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
