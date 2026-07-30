export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      ai_briefs: {
        Row: {
          applied_video_id: string | null
          applied_writing_task_id: string | null
          caption_drafts: Json
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          prompt: string | null
          shoot_checklist: Json
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
          writing_brief: string | null
        }
        Insert: {
          applied_video_id?: string | null
          applied_writing_task_id?: string | null
          caption_drafts?: Json
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prompt?: string | null
          shoot_checklist?: Json
          source_id?: string | null
          source_type: string
          status?: string
          updated_at?: string
          writing_brief?: string | null
        }
        Update: {
          applied_video_id?: string | null
          applied_writing_task_id?: string | null
          caption_drafts?: Json
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          prompt?: string | null
          shoot_checklist?: Json
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          writing_brief?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_briefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          admin_note: string | null
          created_at: string | null
          current_state: string | null
          date: string
          id: string
          login_time: string
          logout_time: string | null
          lunch_duration_minutes: number | null
          lunch_end: string | null
          lunch_skipped: boolean | null
          lunch_start: string | null
          status: string | null
          total_hours_worked: number | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          current_state?: string | null
          date: string
          id?: string
          login_time: string
          logout_time?: string | null
          lunch_duration_minutes?: number | null
          lunch_end?: string | null
          lunch_skipped?: boolean | null
          lunch_start?: string | null
          status?: string | null
          total_hours_worked?: number | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          current_state?: string | null
          date?: string
          id?: string
          login_time?: string
          logout_time?: string | null
          lunch_duration_minutes?: number | null
          lunch_end?: string | null
          lunch_skipped?: boolean | null
          lunch_start?: string | null
          status?: string | null
          total_hours_worked?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      caption_templates: {
        Row: {
          body: string
          category: string
          client_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          platforms: Json
          updated_at: string
          usage_count: number
        }
        Insert: {
          body: string
          category?: string
          client_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          platforms?: Json
          updated_at?: string
          usage_count?: number
        }
        Update: {
          body?: string
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          platforms?: Json
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      client_assets: {
        Row: {
          asset_type: string
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          asset_type?: string
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          asset_type?: string
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ideas: {
        Row: {
          admin_response: string | null
          client_id: string
          converted_video_id: string | null
          created_at: string
          description: string | null
          id: string
          photo_urls: Json | null
          status: string
          submitted_by: string
          title: string
          updated_at: string
          voice_duration_seconds: number | null
          voice_note_url: string | null
        }
        Insert: {
          admin_response?: string | null
          client_id: string
          converted_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_urls?: Json | null
          status?: string
          submitted_by: string
          title: string
          updated_at?: string
          voice_duration_seconds?: number | null
          voice_note_url?: string | null
        }
        Update: {
          admin_response?: string | null
          client_id?: string
          converted_video_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          photo_urls?: Json | null
          status?: string
          submitted_by?: string
          title?: string
          updated_at?: string
          voice_duration_seconds?: number | null
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_ideas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ideas_converted_video_id_fkey"
            columns: ["converted_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ideas_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ratings: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          id: string
          rating: number
          submitted_by: string
          video_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          submitted_by: string
          video_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          submitted_by?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ratings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ratings_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_ratings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          billing_currency: string | null
          brand_colors: Json | null
          brand_fonts: Json | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          deliverables: Json
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          monthly_deliverables: number | null
          monthly_fee: number | null
          name: string
          notes: string | null
          payment_day: number | null
          phone: string | null
          project_title: string | null
          service_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_currency?: string | null
          brand_colors?: Json | null
          brand_fonts?: Json | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          deliverables?: Json
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          monthly_deliverables?: number | null
          monthly_fee?: number | null
          name: string
          notes?: string | null
          payment_day?: number | null
          phone?: string | null
          project_title?: string | null
          service_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_currency?: string | null
          brand_colors?: Json | null
          brand_fonts?: Json | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          deliverables?: Json
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          monthly_deliverables?: number | null
          monthly_fee?: number | null
          name?: string
          notes?: string | null
          payment_day?: number | null
          phone?: string | null
          project_title?: string | null
          service_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_items: {
        Row: {
          caption_brief: string | null
          client_id: string
          content_type: string
          created_at: string
          hashtags: string | null
          id: string
          is_visible_to_client: boolean
          linked_design_task_id: string | null
          linked_video_id: string | null
          linked_writing_task_id: string | null
          plan_id: string
          planned_date: string | null
          platform: string
          published_url: string | null
          reference_url: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          visual_brief: string | null
        }
        Insert: {
          caption_brief?: string | null
          client_id: string
          content_type: string
          created_at?: string
          hashtags?: string | null
          id?: string
          is_visible_to_client?: boolean
          linked_design_task_id?: string | null
          linked_video_id?: string | null
          linked_writing_task_id?: string | null
          plan_id: string
          planned_date?: string | null
          platform: string
          published_url?: string | null
          reference_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visual_brief?: string | null
        }
        Update: {
          caption_brief?: string | null
          client_id?: string
          content_type?: string
          created_at?: string
          hashtags?: string | null
          id?: string
          is_visible_to_client?: boolean
          linked_design_task_id?: string | null
          linked_video_id?: string | null
          linked_writing_task_id?: string | null
          plan_id?: string
          planned_date?: string | null
          platform?: string
          published_url?: string | null
          reference_url?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visual_brief?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_linked_design_task_id_fkey"
            columns: ["linked_design_task_id"]
            isOneToOne: false
            referencedRelation: "design_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_linked_video_id_fkey"
            columns: ["linked_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_linked_writing_task_id_fkey"
            columns: ["linked_writing_task_id"]
            isOneToOne: false
            referencedRelation: "writing_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "content_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      content_plans: {
        Row: {
          approved_at: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          month: number
          status: string
          strategy_notes: string | null
          title: string | null
          updated_at: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month: number
          status?: string
          strategy_notes?: string | null
          title?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month?: number
          status?: string
          strategy_notes?: string | null
          title?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_todos: {
        Row: {
          admin_id: string
          carried_over_from: string | null
          completed_at: string | null
          created_at: string
          id: string
          is_complete: boolean
          original_date: string
          priority: string
          title: string
        }
        Insert: {
          admin_id: string
          carried_over_from?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          original_date?: string
          priority?: string
          title: string
        }
        Update: {
          admin_id?: string
          carried_over_from?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          original_date?: string
          priority?: string
          title?: string
        }
        Relationships: []
      }
      design_tasks: {
        Row: {
          assigned_designer: string | null
          client_id: string
          created_at: string
          drive_link: string | null
          due_date: string | null
          figma_link: string | null
          id: string
          status: string
          task_type: string
          title: string
          updated_at: string
          version_notes: string | null
          video_id: string | null
        }
        Insert: {
          assigned_designer?: string | null
          client_id: string
          created_at?: string
          drive_link?: string | null
          due_date?: string | null
          figma_link?: string | null
          id?: string
          status?: string
          task_type?: string
          title: string
          updated_at?: string
          version_notes?: string | null
          video_id?: string | null
        }
        Update: {
          assigned_designer?: string | null
          client_id?: string
          created_at?: string
          drive_link?: string | null
          due_date?: string | null
          figma_link?: string | null
          id?: string
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          version_notes?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_tasks_assigned_designer_fkey"
            columns: ["assigned_designer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_tasks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          client_id: string
          content: string | null
          created_at: string
          id: string
          is_resolved: boolean
          submitted_by: string
          timestamp_in_video: string | null
          type: string
          video_id: string
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          submitted_by: string
          timestamp_in_video?: string | null
          type?: string
          video_id: string
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          submitted_by?: string
          timestamp_in_video?: string | null
          type?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      file_versions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_url: string
          id: string
          notes: string | null
          uploaded_by: string
          version_number: number
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_url: string
          id?: string
          notes?: string | null
          uploaded_by: string
          version_number?: number
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          uploaded_by?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtag_groups: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string
          hashtags: string
          id: string
          name: string
          niche: string | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by: string
          hashtags: string
          id?: string
          name: string
          niche?: string | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string
          hashtags?: string
          id?: string
          name?: string
          niche?: string | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: []
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_on: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_on?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_on?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          paid_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          approvals: boolean
          assignments: boolean
          client_feedback: boolean
          created_at: string
          daily_digest: boolean
          deadlines: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approvals?: boolean
          assignments?: boolean
          client_feedback?: boolean
          created_at?: string
          daily_digest?: boolean
          deadlines?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approvals?: boolean
          assignments?: boolean
          client_feedback?: boolean
          created_at?: string
          daily_digest?: boolean
          deadlines?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string | null
          related_client_id: string | null
          related_video_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id?: string | null
          related_client_id?: string | null
          related_video_id?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string | null
          related_client_id?: string | null
          related_video_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_client_id_fkey"
            columns: ["related_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_video_id_fkey"
            columns: ["related_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_online: boolean | null
          joining_date: string | null
          last_seen: string | null
          monthly_salary: number | null
          phone: string | null
          salary_currency: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          is_online?: boolean | null
          joining_date?: string | null
          last_seen?: string | null
          monthly_salary?: number | null
          phone?: string | null
          salary_currency?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          joining_date?: string | null
          last_seen?: string | null
          monthly_salary?: number | null
          phone?: string | null
          salary_currency?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salary_advances: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deduct_from_month: string | null
          id: string
          notes: string | null
          paid_on: string | null
          payment_method: string | null
          reason: string | null
          requested_on: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deduct_from_month?: string | null
          id?: string
          notes?: string | null
          paid_on?: string | null
          payment_method?: string | null
          reason?: string | null
          requested_on?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deduct_from_month?: string | null
          id?: string
          notes?: string | null
          paid_on?: string | null
          payment_method?: string | null
          reason?: string | null
          requested_on?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          paid_on: string | null
          payment_method: string | null
          period_month: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_on?: string | null
          payment_method?: string | null
          period_month: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          paid_on?: string | null
          payment_method?: string | null
          period_month?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          analytics: Json
          analytics_updated_at: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          caption: string | null
          client_approval_at: string | null
          client_approval_status: string | null
          client_approval_token: string | null
          client_feedback: string | null
          client_id: string
          created_at: string
          created_by: string
          hashtags: string | null
          id: string
          linked_design_task_id: string | null
          linked_video_id: string | null
          media_type: string
          media_urls: Json
          notes: string | null
          platform_urls: Json
          platforms: Json
          published_at: string | null
          rejection_reason: string | null
          reminder_sent_at: string | null
          scheduled_at: string | null
          status: string
          submitted_for_approval_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          analytics?: Json
          analytics_updated_at?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          caption?: string | null
          client_approval_at?: string | null
          client_approval_status?: string | null
          client_approval_token?: string | null
          client_feedback?: string | null
          client_id: string
          created_at?: string
          created_by: string
          hashtags?: string | null
          id?: string
          linked_design_task_id?: string | null
          linked_video_id?: string | null
          media_type?: string
          media_urls?: Json
          notes?: string | null
          platform_urls?: Json
          platforms?: Json
          published_at?: string | null
          rejection_reason?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          analytics?: Json
          analytics_updated_at?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          caption?: string | null
          client_approval_at?: string | null
          client_approval_status?: string | null
          client_approval_token?: string | null
          client_feedback?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          hashtags?: string | null
          id?: string
          linked_design_task_id?: string | null
          linked_video_id?: string | null
          media_type?: string
          media_urls?: Json
          notes?: string | null
          platform_urls?: Json
          platforms?: Json
          published_at?: string | null
          rejection_reason?: string | null
          reminder_sent_at?: string | null
          scheduled_at?: string | null
          status?: string
          submitted_for_approval_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      script_collaborators: {
        Row: {
          created_at: string
          id: string
          role: string
          script_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          script_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          script_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_collaborators_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_comments: {
        Row: {
          anchor: Json | null
          author_id: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
          resolved: boolean
          script_id: string
          updated_at: string
        }
        Insert: {
          anchor?: Json | null
          author_id: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          script_id: string
          updated_at?: string
        }
        Update: {
          anchor?: Json | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          script_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "script_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_comments_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_updates: {
        Row: {
          author_id: string | null
          created_at: string
          id: number
          script_id: string
          update: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: number
          script_id: string
          update: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: number
          script_id?: string
          update?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_updates_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          archived: boolean
          char_count: number
          client_id: string | null
          content_html: string | null
          content_json: Json | null
          created_at: string
          created_by: string
          id: string
          linked_content_item_id: string | null
          linked_video_id: string | null
          linked_writing_task_id: string | null
          title: string
          updated_at: string
          updated_by: string | null
          word_count: number
          ydoc_state: string | null
        }
        Insert: {
          archived?: boolean
          char_count?: number
          client_id?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          created_by: string
          id?: string
          linked_content_item_id?: string | null
          linked_video_id?: string | null
          linked_writing_task_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          word_count?: number
          ydoc_state?: string | null
        }
        Update: {
          archived?: boolean
          char_count?: number
          client_id?: string | null
          content_html?: string | null
          content_json?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          linked_content_item_id?: string | null
          linked_video_id?: string | null
          linked_writing_task_id?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          word_count?: number
          ydoc_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_linked_content_item_id_fkey"
            columns: ["linked_content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_linked_video_id_fkey"
            columns: ["linked_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_linked_writing_task_id_fkey"
            columns: ["linked_writing_task_id"]
            isOneToOne: true
            referencedRelation: "writing_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          mentions: string[] | null
          parent_id: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          mentions?: string[] | null
          parent_id?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "video_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          assigned_camera_operator: string | null
          assigned_editor: string | null
          assigned_social_id: string | null
          client_id: string
          created_at: string
          date_delivered: string | null
          date_planned: string | null
          description: string | null
          drive_link: string | null
          due_date: string | null
          footage_uploaded_at: string | null
          id: string
          internal_notes: string | null
          is_internal_note_visible_to_client: boolean
          live_url: string | null
          priority: number
          raw_footage_link: string | null
          shoot_checklist: Json | null
          shoot_date: string | null
          shoot_location: string | null
          shoot_notes: string | null
          shoot_start_time: string | null
          social_posted_at: string | null
          social_scheduled_at: string | null
          social_stage: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_camera_operator?: string | null
          assigned_editor?: string | null
          assigned_social_id?: string | null
          client_id: string
          created_at?: string
          date_delivered?: string | null
          date_planned?: string | null
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          footage_uploaded_at?: string | null
          id?: string
          internal_notes?: string | null
          is_internal_note_visible_to_client?: boolean
          live_url?: string | null
          priority?: number
          raw_footage_link?: string | null
          shoot_checklist?: Json | null
          shoot_date?: string | null
          shoot_location?: string | null
          shoot_notes?: string | null
          shoot_start_time?: string | null
          social_posted_at?: string | null
          social_scheduled_at?: string | null
          social_stage?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_camera_operator?: string | null
          assigned_editor?: string | null
          assigned_social_id?: string | null
          client_id?: string
          created_at?: string
          date_delivered?: string | null
          date_planned?: string | null
          description?: string | null
          drive_link?: string | null
          due_date?: string | null
          footage_uploaded_at?: string | null
          id?: string
          internal_notes?: string | null
          is_internal_note_visible_to_client?: boolean
          live_url?: string | null
          priority?: number
          raw_footage_link?: string | null
          shoot_checklist?: Json | null
          shoot_date?: string | null
          shoot_location?: string | null
          shoot_notes?: string | null
          shoot_start_time?: string | null
          social_posted_at?: string | null
          social_scheduled_at?: string | null
          social_stage?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_assigned_camera_operator_fkey"
            columns: ["assigned_camera_operator"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_assigned_editor_fkey"
            columns: ["assigned_editor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_assigned_social_id_fkey"
            columns: ["assigned_social_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          stage: string
          template_text: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          stage: string
          template_text: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          stage?: string
          template_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          client_id: string | null
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          entity_id: string
          entity_title: string | null
          entity_type: string
          id: string
          note: string | null
          started_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          entity_id: string
          entity_title?: string | null
          entity_type: string
          id?: string
          note?: string | null
          started_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          entity_id?: string
          entity_title?: string | null
          entity_type?: string
          id?: string
          note?: string | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      writing_tasks: {
        Row: {
          assigned_writer: string | null
          client_id: string
          created_at: string
          doc_link: string | null
          due_date: string | null
          id: string
          script_duration_seconds: number | null
          status: string
          target_duration_seconds: number | null
          task_type: string
          title: string
          updated_at: string
          version_notes: string | null
          video_id: string | null
          word_count_target: number | null
        }
        Insert: {
          assigned_writer?: string | null
          client_id: string
          created_at?: string
          doc_link?: string | null
          due_date?: string | null
          id?: string
          script_duration_seconds?: number | null
          status?: string
          target_duration_seconds?: number | null
          task_type?: string
          title: string
          updated_at?: string
          version_notes?: string | null
          video_id?: string | null
          word_count_target?: number | null
        }
        Update: {
          assigned_writer?: string | null
          client_id?: string
          created_at?: string
          doc_link?: string | null
          due_date?: string | null
          id?: string
          script_duration_seconds?: number | null
          status?: string
          target_duration_seconds?: number | null
          task_type?: string
          title?: string
          updated_at?: string
          version_notes?: string | null
          video_id?: string | null
          word_count_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "writing_tasks_assigned_writer_fkey"
            columns: ["assigned_writer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "writing_tasks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_active_work_sessions: {
        Args: never
        Returns: {
          client_id: string
          entity_id: string
          entity_title: string
          entity_type: string
          full_name: string
          id: string
          started_at: string
          user_id: string
        }[]
      }
      admin_get_client: {
        Args: { _id: string }
        Returns: {
          billing_currency: string | null
          brand_colors: Json | null
          brand_fonts: Json | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          deliverables: Json
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          monthly_deliverables: number | null
          monthly_fee: number | null
          name: string
          notes: string | null
          payment_day: number | null
          phone: string | null
          project_title: string | null
          service_type: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_list_clients: {
        Args: never
        Returns: {
          billing_currency: string | null
          brand_colors: Json | null
          brand_fonts: Json | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          deliverables: Json
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          monthly_deliverables: number | null
          monthly_fee: number | null
          name: string
          notes: string | null
          payment_day: number | null
          phone: string | null
          project_title: string | null
          service_type: string
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_list_profiles: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_online: boolean | null
          joining_date: string | null
          last_seen: string | null
          monthly_salary: number | null
          phone: string | null
          salary_currency: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_access_script: {
        Args: { _script_id: string; _user_id: string }
        Returns: boolean
      }
      can_edit_script: {
        Args: { _script_id: string; _user_id: string }
        Returns: boolean
      }
      client_get_own_data: {
        Args: never
        Returns: {
          billing_currency: string | null
          brand_colors: Json | null
          brand_fonts: Json | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          deliverables: Json
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          monthly_deliverables: number | null
          monthly_fee: number | null
          name: string
          notes: string | null
          payment_day: number | null
          phone: string | null
          project_title: string | null
          service_type: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_script: {
        Args: {
          _client_id?: string
          _linked_content_item_id?: string
          _linked_video_id?: string
          _linked_writing_task_id?: string
          _title: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_client_id_for_user: { Args: { _user_id: string }; Returns: string }
      get_own_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          designation: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_online: boolean | null
          joining_date: string | null
          last_seen: string | null
          monthly_salary: number | null
          phone: string | null
          salary_currency: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      team_list_clients: {
        Args: never
        Returns: {
          brand_colors: Json
          brand_fonts: Json
          contact_person: string
          deliverables: Json
          email: string
          id: string
          industry: string
          is_active: boolean
          logo_url: string
          name: string
          notes: string
          phone: string
          project_title: string
          service_type: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "designer"
        | "writer"
        | "client"
        | "camera_operator"
        | "social_executive"
        | "coo"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "editor",
        "designer",
        "writer",
        "client",
        "camera_operator",
        "social_executive",
        "coo",
      ],
    },
  },
} as const
