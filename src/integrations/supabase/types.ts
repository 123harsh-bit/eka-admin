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
      clients: {
        Row: {
          brand_colors: Json | null
          brand_fonts: Json | null
          contact_person: string | null
          contract_end: string | null
          contract_start: string | null
          created_at: string
          email: string | null
          id: string
          industry: string | null
          is_active: boolean
          logo_url: string | null
          monthly_deliverables: number | null
          name: string
          notes: string | null
          phone: string | null
          project_title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          monthly_deliverables?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          project_title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          brand_colors?: Json | null
          brand_fonts?: Json | null
          contact_person?: string | null
          contract_end?: string | null
          contract_start?: string | null
          created_at?: string
          email?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          logo_url?: string | null
          monthly_deliverables?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          project_title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          email: string
          full_name: string
          id: string
          is_active: boolean
          is_online: boolean | null
          last_seen: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          is_online?: boolean | null
          last_seen?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          is_online?: boolean | null
          last_seen?: string | null
          phone?: string | null
          updated_at?: string
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
      videos: {
        Row: {
          assigned_camera_operator: string | null
          assigned_editor: string | null
          client_id: string
          created_at: string
          date_delivered: string | null
          date_planned: string | null
          description: string | null
          drive_link: string | null
          footage_uploaded_at: string | null
          id: string
          internal_notes: string | null
          is_internal_note_visible_to_client: boolean
          live_url: string | null
          raw_footage_link: string | null
          shoot_date: string | null
          shoot_location: string | null
          shoot_notes: string | null
          shoot_start_time: string | null
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_camera_operator?: string | null
          assigned_editor?: string | null
          client_id: string
          created_at?: string
          date_delivered?: string | null
          date_planned?: string | null
          description?: string | null
          drive_link?: string | null
          footage_uploaded_at?: string | null
          id?: string
          internal_notes?: string | null
          is_internal_note_visible_to_client?: boolean
          live_url?: string | null
          raw_footage_link?: string | null
          shoot_date?: string | null
          shoot_location?: string | null
          shoot_notes?: string | null
          shoot_start_time?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_camera_operator?: string | null
          assigned_editor?: string | null
          client_id?: string
          created_at?: string
          date_delivered?: string | null
          date_planned?: string | null
          description?: string | null
          drive_link?: string | null
          footage_uploaded_at?: string | null
          id?: string
          internal_notes?: string | null
          is_internal_note_visible_to_client?: boolean
          live_url?: string | null
          raw_footage_link?: string | null
          shoot_date?: string | null
          shoot_location?: string | null
          shoot_notes?: string | null
          shoot_start_time?: string | null
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
            foreignKeyName: "videos_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      get_client_id_for_user: { Args: { _user_id: string }; Returns: string }
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
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "designer"
        | "writer"
        | "client"
        | "camera_operator"
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
      ],
    },
  },
} as const
