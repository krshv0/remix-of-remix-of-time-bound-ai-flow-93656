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
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          pinned: boolean | null
          session_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pinned?: boolean | null
          session_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pinned?: boolean | null
          session_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      image_generations: {
        Row: {
          batch_count: number | null
          cfg_scale: number | null
          conversation_id: string | null
          created_at: string | null
          generation_time_ms: number | null
          height: number | null
          id: string
          image_session_id: string | null
          image_url: string
          model_used: string | null
          negative_prompt: string | null
          prompt: string
          resolution: string | null
          seed: number | null
          session_id: string
          steps: number | null
          user_id: string
          width: number | null
        }
        Insert: {
          batch_count?: number | null
          cfg_scale?: number | null
          conversation_id?: string | null
          created_at?: string | null
          generation_time_ms?: number | null
          height?: number | null
          id?: string
          image_session_id?: string | null
          image_url: string
          model_used?: string | null
          negative_prompt?: string | null
          prompt: string
          resolution?: string | null
          seed?: number | null
          session_id: string
          steps?: number | null
          user_id: string
          width?: number | null
        }
        Update: {
          batch_count?: number | null
          cfg_scale?: number | null
          conversation_id?: string | null
          created_at?: string | null
          generation_time_ms?: number | null
          height?: number | null
          id?: string
          image_session_id?: string | null
          image_url?: string
          model_used?: string | null
          negative_prompt?: string | null
          prompt?: string
          resolution?: string | null
          seed?: number | null
          session_id?: string
          steps?: number | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_generations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_generations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_config: {
        Row: {
          created_at: string
          id: string
          image_credits_per_hour: number | null
          model_name: string
          plan_id: string
          token_limit_per_hour: number
          updated_at: string
          video_credits_per_hour: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_credits_per_hour?: number | null
          model_name: string
          plan_id: string
          token_limit_per_hour: number
          updated_at?: string
          video_credits_per_hour?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          image_credits_per_hour?: number | null
          model_name?: string
          plan_id?: string
          token_limit_per_hour?: number
          updated_at?: string
          video_credits_per_hour?: number | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          hours_purchased: number
          id: string
          images_generated: number | null
          model_name: string
          plan_id: string
          price_paid: number
          session_type: string | null
          status: string
          tokens_used: number | null
          updated_at: string
          user_id: string
          videos_generated: number | null
          videos_remaining: number | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          hours_purchased: number
          id?: string
          images_generated?: number | null
          model_name: string
          plan_id: string
          price_paid: number
          session_type?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
          user_id: string
          videos_generated?: number | null
          videos_remaining?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          hours_purchased?: number
          id?: string
          images_generated?: number | null
          model_name?: string
          plan_id?: string
          price_paid?: number
          session_type?: string | null
          status?: string
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
          videos_generated?: number | null
          videos_remaining?: number | null
        }
        Relationships: []
      }
      video_generations: {
        Row: {
          completed_at: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          fps: number | null
          generation_time_seconds: number | null
          id: string
          metadata: Json | null
          model_used: string | null
          num_frames: number | null
          prompt: string
          resolution: string | null
          retry_count: number | null
          session_id: string
          status: string
          thumbnail_url: string | null
          user_id: string
          video_url: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          fps?: number | null
          generation_time_seconds?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          num_frames?: number | null
          prompt: string
          resolution?: string | null
          retry_count?: number | null
          session_id: string
          status?: string
          thumbnail_url?: string | null
          user_id: string
          video_url?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          fps?: number | null
          generation_time_seconds?: number | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          num_frames?: number | null
          prompt?: string
          resolution?: string | null
          retry_count?: number | null
          session_id?: string
          status?: string
          thumbnail_url?: string | null
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_generations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
