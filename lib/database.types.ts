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
      interest_categories: {
        Row: {
          id: string
          name: string
          emoji: string
          sort_order: number | null
        }
        Insert: {
          id: string
          name: string
          emoji: string
          sort_order?: number | null
        }
        Update: {
          id?: string
          name?: string
          emoji?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_user_id: string | null
          created_at: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          blocked_user_id?: string | null
          created_at?: string | null
          id?: never
          user_id?: string | null
        }
        Update: {
          blocked_user_id?: string | null
          created_at?: string | null
          id?: never
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_user_id_fkey"
            columns: ["blocked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          content: string
          id: string
          is_read: boolean | null
          match_id: string
          paper_style: string | null
          read_at: string | null
          receiver_id: string
          sender_id: string
          sent_at: string | null
          sticker: string | null
        }
        Insert: {
          content: string
          id?: string
          is_read?: boolean | null
          match_id: string
          paper_style?: string | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
          sent_at?: string | null
          sticker?: string | null
        }
        Update: {
          content?: string
          id?: string
          is_read?: boolean | null
          match_id?: string
          paper_style?: string | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          sent_at?: string | null
          sticker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letters_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_history: {
        Row: {
          last_matched: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          last_matched: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          last_matched?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_history_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_history_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          user_a_id: string
          user_b_id: string
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          user_a_id: string
          user_b_id: string
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          user_a_id?: string
          user_b_id?: string
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_a_id_fkey"
            columns: ["user_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_b_id_fkey"
            columns: ["user_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          payload: Json | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          payload?: Json | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      point_logs: {
        Row: {
          amount: number
          created_at: string | null
          id: number
          reason: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: never
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: never
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "point_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          AI: string | null
          avatar_color: string | null
          avatar_type: number | null
          bio: string | null
          birth_date: string | null
          created_at: string
          email: string | null
          house_x: number | null
          house_y: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_failed_at: string | null
          last_seen: string | null
          level: number | null
          location: string | null
          login_attempts: number | null
          login_username: string | null
          nickname: string | null
          phone_number: string | null
          points: number | null
          real_name: string | null
          username: string | null
          verification_ci: string | null
          verification_id: string | null
          village_id: string | null
          match_category: string | null
        }
        Insert: {
          age?: number | null
          AI?: string | null
          avatar_color?: string | null
          avatar_type?: number | null
          bio?: string | null
          birth_date?: string | null
          created_at: string
          email?: string | null
          house_x?: number | null
          house_y?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_failed_at?: string | null
          last_seen?: string | null
          level?: number | null
          location?: string | null
          login_attempts?: number | null
          login_username?: string | null
          nickname?: string | null
          phone_number?: string | null
          points?: number | null
          real_name?: string | null
          username?: string | null
          verification_ci?: string | null
          verification_id?: string | null
          village_id?: string | null
          match_category?: string | null
        }
        Update: {
          age?: number | null
          AI?: string | null
          avatar_color?: string | null
          avatar_type?: number | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          email?: string | null
          house_x?: number | null
          house_y?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_failed_at?: string | null
          last_seen?: string | null
          level?: number | null
          location?: string | null
          login_attempts?: number | null
          login_username?: string | null
          nickname?: string | null
          phone_number?: string | null
          points?: number | null
          real_name?: string | null
          username?: string | null
          verification_ci?: string | null
          verification_id?: string | null
          village_id?: string | null
          match_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      replies: {
        Row: {
          content: string | null
          created_at: string
          id: string
          letter_id: string | null
          receiver_id: string | null
          sender_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          letter_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          letter_id?: string | null
          receiver_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "replies_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replies_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          letter_id: string | null
          reason: string | null
          reported_id: string | null
          reporter_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          letter_id?: string | null
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          letter_id?: string | null
          reason?: string | null
          reported_id?: string | null
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string | null
          price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string | null
          price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string | null
          price?: number | null
        }
        Relationships: []
      }
      user_items: {
        Row: {
          id: number
          is_equipped: boolean | null
          item_id: string | null
          profile_id: string | null
          purchased_at: string
        }
        Insert: {
          id?: number
          is_equipped?: boolean | null
          item_id?: string | null
          profile_id?: string | null
          purchased_at?: string
        }
        Update: {
          id?: number
          is_equipped?: boolean | null
          item_id?: string | null
          profile_id?: string | null
          purchased_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_item_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_item_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          color_hex: string
          created_at: string | null
          id: string
          name: string
          theme: string
        }
        Insert: {
          color_hex?: string
          created_at?: string | null
          id?: string
          name: string
          theme?: string
        }
        Update: {
          color_hex?: string
          created_at?: string | null
          id?: string
          name?: string
          theme?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buy_item: { Args: { target_item_id: string }; Returns: undefined }
      check_and_notify_arrivals: { Args: never; Returns: undefined }
      check_final_day_notifications: { Args: never; Returns: undefined }
      delete_user_account: { Args: never; Returns: undefined }
      equip_item: { Args: { target_user_item_id: string }; Returns: undefined }
      find_best_match: {
        Args: { p_sender_age: number; p_sender_id: string }
        Returns: string
      }
      get_delivery_status: {
        Args: { letter_id: string }
        Returns: {
          current_step: number
          remaining_minutes: number
          step_name: string
        }[]
      }
      mark_all_notifications_as_read: { Args: never; Returns: undefined }
      record_login_failure: { Args: { p_username: string }; Returns: number }
      reset_login_attempts: { Args: { p_user_id: string }; Returns: undefined }
      reset_password_with_auth: {
        Args: {
          p_new_password: string
          p_username: string
          p_verification_ci: string
        }
        Returns: boolean
      }
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
