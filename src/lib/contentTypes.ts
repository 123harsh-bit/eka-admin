export interface ContentPlan {
  id: string;
  client_id: string;
  month: number;
  year: number;
  title: string | null;
  strategy_notes: string | null;
  status: string;
  approved_at: string | null;
  created_by: string | null;
}

export interface ContentItem {
  id: string;
  plan_id: string;
  client_id: string;
  title: string;
  content_type: string;
  platform: string;
  planned_date: string | null;
  caption_brief: string | null;
  visual_brief: string | null;
  reference_url: string | null;
  hashtags: string | null;
  status: string;
  published_url: string | null;
  thumbnail_url: string | null;
  linked_video_id: string | null;
  linked_writing_task_id: string | null;
  linked_design_task_id: string | null;
  is_visible_to_client: boolean;
}
