import { supabase } from '@/integrations/supabase/client';

interface StatusChangeResult {
  success: boolean;
  error?: string;
  requiresInput?: 'shoot_assignment' | 'editor_assignment' | 'live_url' | 'writer_assignment' | 'script_changes';
  warning?: string;
}

export async function handleVideoStatusChange(
  videoId: string,
  newStatus: string,
  currentUserId: string,
  additionalData?: Record<string, unknown>
): Promise<StatusChangeResult> {
  const { data: video, error: fetchErr } = await supabase
    .from('videos')
    .select('id, title, status, client_id, assigned_editor, assigned_camera_operator, raw_footage_link, drive_link, live_url, date_planned, clients(name)')
    .eq('id', videoId)
    .single();

  if (fetchErr || !video) return { success: false, error: 'Video not found' };

  const clientName = (video.clients as any)?.name || 'Unknown';
  const title = video.title;

  switch (newStatus) {
    case 'scripting': {
      // Auto-create writing task if writer provided
      const writerId = additionalData?.assigned_writer as string;
      if (writerId) {
        // Check if writing task already exists for this video
        const { data: existing } = await supabase.from('writing_tasks').select('id').eq('video_id', videoId).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('writing_tasks').insert({
            title: `${title} — Script`,
            client_id: video.client_id,
            video_id: videoId,
            assigned_writer: writerId,
            task_type: 'reel_script',
            status: 'briefed',
            due_date: additionalData?.due_date || null,
          } as any);
        }
        await insertNotification(writerId, `📝 New script assignment: '${title}' for ${clientName}. Please begin and share your Google Drive link when ready.`, videoId, video.client_id);
      }
      break;
    }
    case 'script_submitted': {
      // Writer submits — notify admin
      const adminIds = await getAdminIds();
      const { data: writerProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `📝 ${writerProfile?.full_name || 'Writer'} submitted script for '${title}'. Review it and decide next step.`, videoId, video.client_id);
      }
      // Update linked writing task status
      await supabase.from('writing_tasks').update({ status: 'review' }).eq('video_id', videoId);
      break;
    }
    case 'script_client_review': {
      // Admin sends script to client
      if (video.client_id) {
        const { data: clientData } = await supabase.from('clients').select('user_id').eq('id', video.client_id).single();
        if (clientData?.user_id) {
          await insertNotification(clientData.user_id, `📄 Your script for '${title}' is ready for your review. Log in to read and approve it.`, videoId, video.client_id);
        }
      }
      break;
    }
    case 'script_approved': {
      // Client approves script
      const { data: writingTask } = await supabase.from('writing_tasks').select('assigned_writer').eq('video_id', videoId).limit(1).single();
      if (writingTask?.assigned_writer) {
        await insertNotification(writingTask.assigned_writer, `✅ Your script for '${title}' has been approved! Great work.`, videoId, video.client_id);
      }
      // Update writing task
      await supabase.from('writing_tasks').update({ status: 'approved' }).eq('video_id', videoId);
      // Notify admin
      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `✅ ${clientName} approved the script for '${title}'! Ready to schedule the shoot.`, videoId, video.client_id);
      }
      break;
    }
    case 'shoot_assigned': {
      const camOp = additionalData?.assigned_camera_operator as string;
      if (!camOp) return { success: false, requiresInput: 'shoot_assignment' };
      
      const shootUpdate: Record<string, unknown> = {
        assigned_camera_operator: camOp,
        shoot_date: additionalData?.shoot_date || null,
        shoot_start_time: additionalData?.shoot_start_time || null,
        shoot_location: additionalData?.shoot_location || null,
        shoot_notes: additionalData?.shoot_notes || null,
        status: newStatus,
      };
      const { error } = await supabase.from('videos').update(shootUpdate as any).eq('id', videoId);
      if (error) return { success: false, error: error.message };

      const shootDate = additionalData?.shoot_date ? new Date(additionalData.shoot_date as string).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';
      await insertNotification(camOp,
        `🎬 New shoot: '${title}' for ${clientName}. 📅 ${shootDate} · 📍 ${additionalData?.shoot_location || 'TBD'}. Check your dashboard.`,
        videoId, video.client_id
      );

      await logActivity(videoId, 'status_changed', { status: newStatus }, currentUserId);
      return { success: true };
    }
    case 'shooting': {
      if (video.assigned_camera_operator) {
        const { data: camProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single();
        const adminIds = await getAdminIds();
        for (const adminId of adminIds) {
          await insertNotification(adminId, `🎥 ${camProfile?.full_name || 'Camera Op'} has started filming '${title}' for ${clientName}.`, videoId, video.client_id);
        }
      }
      break;
    }
    case 'footage_delivered': {
      const adminIds = await getAdminIds();
      const { data: camProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `📁 Raw footage for '${title}' uploaded by ${camProfile?.full_name || 'Camera Op'}. Assign an editor.`, videoId, video.client_id);
      }
      if (video.assigned_editor) {
        await insertNotification(video.assigned_editor, `📁 Raw footage for '${title}' is ready — you can start editing.`, videoId, video.client_id);
      }
      await supabase.from('videos').update({ footage_uploaded_at: new Date().toISOString() } as any).eq('id', videoId);
      break;
    }
    case 'editing': {
      if (!video.assigned_editor && !additionalData?.assigned_editor) {
        return { success: false, requiresInput: 'editor_assignment' };
      }
      const editorId = (additionalData?.assigned_editor as string) || video.assigned_editor;
      if (additionalData?.assigned_editor) {
        await supabase.from('videos').update({ assigned_editor: editorId }).eq('id', videoId);
      }
      if (editorId) {
        await insertNotification(editorId, `✂️ '${title}' for ${clientName} is ready for editing. Raw footage is attached.`, videoId, video.client_id);
      }
      break;
    }
    case 'internal_review': {
      const { data: editorProfile } = await supabase.from('profiles').select('full_name').eq('id', currentUserId).single();
      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `🔍 '${title}' edit is complete. ${editorProfile?.full_name || 'Editor'} submitted it for review.`, videoId, video.client_id);
      }
      break;
    }
    case 'client_review': {
      if (video.client_id) {
        const { data: clientData } = await supabase.from('clients').select('user_id').eq('id', video.client_id).single();
        if (clientData?.user_id) {
          await insertNotification(clientData.user_id, `👀 Your video '${title}' is ready for your review! Log in to watch.`, videoId, video.client_id);
        }
      }
      break;
    }
    case 'revisions': {
      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `✏️ ${clientName} requested revisions on '${title}'.`, videoId, video.client_id);
      }
      if (video.assigned_editor) {
        await insertNotification(video.assigned_editor, `✏️ Revision requested for '${title}'. Check client feedback.`, videoId, video.client_id);
      }
      break;
    }
    case 'approved': {
      const adminIds = await getAdminIds();
      for (const adminId of adminIds) {
        await insertNotification(adminId, `✅ ${clientName} approved '${title}'! Ready to upload.`, videoId, video.client_id);
      }
      if (video.assigned_editor) {
        await insertNotification(video.assigned_editor, `✅ '${title}' approved by client — great work!`, videoId, video.client_id);
      }
      break;
    }
    case 'live': {
      const liveUrl = additionalData?.live_url as string;
      if (!liveUrl) return { success: false, requiresInput: 'live_url' };

      await supabase.from('videos').update({ live_url: liveUrl, status: 'live' }).eq('id', videoId);

      if (video.client_id) {
        const { data: clientData } = await supabase.from('clients').select('user_id').eq('id', video.client_id).single();
        if (clientData?.user_id) {
          await insertNotification(clientData.user_id, `🟢 Your video '${title}' is now LIVE! ${liveUrl}`, videoId, video.client_id);
        }
      }
      const teamIds = [video.assigned_editor, video.assigned_camera_operator].filter(Boolean) as string[];
      const { data: linkedWritingTask } = await supabase.from('writing_tasks').select('assigned_writer').eq('video_id', videoId).limit(1).single();
      if (linkedWritingTask?.assigned_writer) teamIds.push(linkedWritingTask.assigned_writer);
      const uniqueTeamIds = [...new Set(teamIds)];
      for (const memberId of uniqueTeamIds) {
        await insertNotification(memberId, `🟢 '${title}' for ${clientName} is now live! Great team effort.`, videoId, video.client_id);
      }

      await logActivity(videoId, 'status_changed', { status: 'live' }, currentUserId);
      return { success: true };
    }
  }

  // Default: just update status
  const { error } = await supabase.from('videos').update({ status: newStatus }).eq('id', videoId);
  if (error) return { success: false, error: error.message };

  await logActivity(videoId, 'status_changed', { status: newStatus }, currentUserId);
  return { success: true };
}

async function insertNotification(recipientId: string, message: string, videoId?: string, clientId?: string) {
  await supabase.from('notifications').insert({
    recipient_id: recipientId,
    message,
    type: 'status_update',
    related_video_id: videoId || null,
    related_client_id: clientId || null,
  });
}

async function logActivity(entityId: string, action: string, details: Record<string, unknown>, actorId: string) {
  await supabase.from('activity_log').insert([{
    entity_type: 'video',
    entity_id: entityId,
    action,
    details: details as any,
    actor_id: actorId,
  }]);
}

async function getAdminIds(): Promise<string[]> {
  const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
  return data?.map(r => r.user_id) || [];
}
