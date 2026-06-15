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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      community_channels: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          icon: string | null
          icon_url: string | null
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_channels_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          allow_comments: boolean
          audio_url: string | null
          author_id: string | null
          body: string | null
          channel_id: string
          course_id: string
          cover_url: string | null
          created_at: string
          id: string
          image_url: string | null
          is_live_active: boolean
          is_pinned: boolean
          live_chat_enabled: boolean
          live_ended_at: string | null
          live_started_at: string | null
          position: number
          post_type: string
          status: Database["public"]["Enums"]["post_status"]
          title: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          allow_comments?: boolean
          audio_url?: string | null
          author_id?: string | null
          body?: string | null
          channel_id: string
          course_id: string
          cover_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_live_active?: boolean
          is_pinned?: boolean
          live_chat_enabled?: boolean
          live_ended_at?: string | null
          live_started_at?: string | null
          position?: number
          post_type?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          allow_comments?: boolean
          audio_url?: string | null
          author_id?: string | null
          body?: string | null
          channel_id?: string
          course_id?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_live_active?: boolean
          is_pinned?: boolean
          live_chat_enabled?: boolean
          live_ended_at?: string | null
          live_started_at?: string | null
          position?: number
          post_type?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "community_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      course_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          course_id: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          course_id: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          course_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accent_color: string
          background_color: string
          course_type: Database["public"]["Enums"]["course_type"]
          cover_url: string | null
          created_at: string
          created_by: string | null
          custom_css: string | null
          description: string | null
          expert_id: string | null
          featured_cta_label: string | null
          featured_cta_url: string | null
          featured_description: string | null
          featured_enabled: boolean
          featured_image_url: string | null
          featured_kind: string | null
          featured_title: string | null
          font_family: string
          id: string
          logo_url: string | null
          primary_color: string
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          text_color: string
          theme_mode: string
          title: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          background_color?: string
          course_type?: Database["public"]["Enums"]["course_type"]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          description?: string | null
          expert_id?: string | null
          featured_cta_label?: string | null
          featured_cta_url?: string | null
          featured_description?: string | null
          featured_enabled?: boolean
          featured_image_url?: string | null
          featured_kind?: string | null
          featured_title?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          text_color?: string
          theme_mode?: string
          title: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          course_type?: Database["public"]["Enums"]["course_type"]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          custom_css?: string | null
          description?: string | null
          expert_id?: string | null
          featured_cta_label?: string | null
          featured_cta_url?: string | null
          featured_description?: string | null
          featured_enabled?: boolean
          featured_image_url?: string | null
          featured_kind?: string | null
          featured_title?: string | null
          font_family?: string
          id?: string
          logo_url?: string | null
          primary_color?: string
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          text_color?: string
          theme_mode?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          blocked_at: string | null
          created_at: string
          created_by: string | null
          display_name: string
          email: string
          id: string
          paused_at: string | null
          paused_reason: string | null
          status: Database["public"]["Enums"]["expert_status"]
          updated_at: string
        }
        Insert: {
          blocked_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name: string
          email: string
          id: string
          paused_at?: string | null
          paused_reason?: string | null
          status?: Database["public"]["Enums"]["expert_status"]
          updated_at?: string
        }
        Update: {
          blocked_at?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          email?: string
          id?: string
          paused_at?: string | null
          paused_reason?: string | null
          status?: Database["public"]["Enums"]["expert_status"]
          updated_at?: string
        }
        Relationships: []
      }
      lesson_materials: {
        Row: {
          created_at: string
          file_type: string | null
          id: string
          lesson_id: string
          material_type: string
          name: string
          position: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          file_type?: string | null
          id?: string
          lesson_id: string
          material_type?: string
          name: string
          position?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          file_type?: string | null
          id?: string
          lesson_id?: string
          material_type?: string
          name?: string
          position?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_materials_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          extra_info: string | null
          id: string
          is_free: boolean
          module_id: string
          position: number
          release_after_days: number
          status: Database["public"]["Enums"]["lesson_status"]
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_embed: string | null
          video_id: string | null
          video_provider: string
          video_url: string | null
          youtube_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          extra_info?: string | null
          id?: string
          is_free?: boolean
          module_id: string
          position?: number
          release_after_days?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_embed?: string | null
          video_id?: string | null
          video_provider?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          extra_info?: string | null
          id?: string
          is_free?: boolean
          module_id?: string
          position?: number
          release_after_days?: number
          status?: Database["public"]["Enums"]["lesson_status"]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_embed?: string | null
          video_id?: string | null
          video_provider?: string
          video_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      live_chat_messages: {
        Row: {
          body: string | null
          created_at: string
          emoji: string | null
          id: string
          is_answered: boolean
          is_pinned: boolean
          is_question: boolean
          post_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_answered?: boolean
          is_pinned?: boolean
          is_question?: boolean
          post_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_answered?: boolean
          is_pinned?: boolean
          is_question?: boolean
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_chat_messages_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          position: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          accent_color: string
          created_at: string
          footer_text: string | null
          id: string
          logo_url: string | null
          platform_name: string
          primary_color: string
          support_email: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          platform_name?: string
          primary_color?: string
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          platform_name?: string
          primary_color?: string
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invitations_for_user: {
        Args: { _email: string; _user_id: string }
        Returns: number
      }
      email_has_pending_invitation: {
        Args: { _email: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_enrolled: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_expert_active: { Args: { _expert_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student" | "expert"
      course_status: "draft" | "published" | "archived"
      course_type: "video" | "community"
      expert_status: "active" | "paused" | "blocked"
      lesson_status: "published" | "draft" | "locked"
      post_status: "published" | "draft" | "hidden"
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
      app_role: ["admin", "student", "expert"],
      course_status: ["draft", "published", "archived"],
      course_type: ["video", "community"],
      expert_status: ["active", "paused", "blocked"],
      lesson_status: ["published", "draft", "locked"],
      post_status: ["published", "draft", "hidden"],
    },
  },
} as const
