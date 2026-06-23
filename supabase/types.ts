export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          id: string
          name: string
          tier_required: string
          description: string | null
          icon_url: string | null
          allows_event_booking: boolean
          allows_guest_pass: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          tier_required: string
          description?: string | null
          icon_url?: string | null
          allows_event_booking?: boolean
          allows_guest_pass?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          tier_required?: string
          description?: string | null
          icon_url?: string | null
          allows_event_booking?: boolean
          allows_guest_pass?: boolean
          created_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          auth_user_id: string | null
          badge_id: string | null
          email: string
          name: string
          tier: string
          status: string
          role: string
          clearance: string
          title: string | null
          location: string | null
          member_since: string | null
          avatar_url: string | null
          display_level: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          badge_id?: string | null
          email: string
          name: string
          tier?: string
          status?: string
          role?: string
          clearance?: string
          title?: string | null
          location?: string | null
          member_since?: string | null
          avatar_url?: string | null
          display_level?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          badge_id?: string | null
          email?: string
          name?: string
          tier?: string
          status?: string
          role?: string
          clearance?: string
          title?: string | null
          location?: string | null
          member_since?: string | null
          avatar_url?: string | null
          display_level?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          member_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      upgrade_requests: {
        Row: {
          id: string
          member_id: string
          reviewed_by: string | null
          from_tier: string
          to_tier: string
          status: string
          payment_reference: string | null
          payment_verified: boolean
          admin_notes: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          member_id: string
          reviewed_by?: string | null
          from_tier: string
          to_tier: string
          status?: string
          payment_reference?: string | null
          payment_verified?: boolean
          admin_notes?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          reviewed_by?: string | null
          from_tier?: string
          to_tier?: string
          status?: string
          payment_reference?: string | null
          payment_verified?: boolean
          admin_notes?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upgrade_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upgrade_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      profit_distributions: {
        Row: {
          id: string
          member_id: string
          amount: number
          period_month: string
          tier_at_time: string
          status: string
          paid_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          amount: number
          period_month: string
          tier_at_time: string
          status?: string
          paid_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          amount?: number
          period_month?: string
          tier_at_time?: string
          status?: string
          paid_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_distributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          member_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          member_id: string
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      otp_codes: {
        Row: {
          id: string
          email: string
          code: string
          expires_at: string
          used: boolean
          attempts: number
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          code: string
          expires_at: string
          used?: boolean
          attempts?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          code?: string
          expires_at?: string
          used?: boolean
          attempts?: number
          created_at?: string
        }
        Relationships: []
      }
      otp_tokens: {
        Row: {
          id: string
          email: string
          code: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          code: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          code?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }
      tier_change_history: {
        Row: {
          id: string
          member_id: string
          changed_by: string | null
          previous_tier: string
          new_tier: string
          changed_at: string
        }
        Insert: {
          id?: string
          member_id: string
          changed_by?: string | null
          previous_tier: string
          new_tier: string
          changed_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          changed_by?: string | null
          previous_tier?: string
          new_tier?: string
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_change_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
      event_bookings: {
        Row: {
          id: string
          member_id: string
          event_name: string
          event_date: string
          includes_guest_pass: boolean
          booking_status: string
          booked_at: string
        }
        Insert: {
          id?: string
          member_id: string
          event_name: string
          event_date: string
          includes_guest_pass?: boolean
          booking_status?: string
          booked_at?: string
        }
        Update: {
          id?: string
          member_id?: string
          event_name?: string
          event_date?: string
          includes_guest_pass?: boolean
          booking_status?: string
          booked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_member_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
