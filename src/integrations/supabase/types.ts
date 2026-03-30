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
      agenda_event_deviations: {
        Row: {
          actual_date: string
          actual_start_time: string
          cancellation_type:
            | Database["public"]["Enums"]["cancellation_type"]
            | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string
          id: string
          is_cancelled: boolean
          needs_reschedule: boolean
          original_date: string
          original_start_time: string
          participant_ids: string[] | null
          reason: string | null
          spans_end_date: string | null
          spans_future_occurrences: boolean
          title: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          actual_date: string
          actual_start_time: string
          cancellation_type?:
            | Database["public"]["Enums"]["cancellation_type"]
            | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id: string
          id?: string
          is_cancelled?: boolean
          needs_reschedule?: boolean
          original_date: string
          original_start_time: string
          participant_ids?: string[] | null
          reason?: string | null
          spans_end_date?: string | null
          spans_future_occurrences?: boolean
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          actual_date?: string
          actual_start_time?: string
          cancellation_type?:
            | Database["public"]["Enums"]["cancellation_type"]
            | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string
          id?: string
          is_cancelled?: boolean
          needs_reschedule?: boolean
          original_date?: string
          original_start_time?: string
          participant_ids?: string[] | null
          reason?: string | null
          spans_end_date?: string | null
          spans_future_occurrences?: boolean
          title?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_event_deviations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_events: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          is_all_day: boolean
          owner_user_id: string
          recurring: boolean
          recurring_end_date: string | null
          recurring_frequency:
            | Database["public"]["Enums"]["lesson_frequency"]
            | null
          source_id: string | null
          source_type: Database["public"]["Enums"]["agenda_event_source_type"]
          start_date: string
          start_time: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          owner_user_id: string
          recurring?: boolean
          recurring_end_date?: string | null
          recurring_frequency?:
            | Database["public"]["Enums"]["lesson_frequency"]
            | null
          source_id?: string | null
          source_type: Database["public"]["Enums"]["agenda_event_source_type"]
          start_date: string
          start_time: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          owner_user_id?: string
          recurring?: boolean
          recurring_end_date?: string | null
          recurring_frequency?:
            | Database["public"]["Enums"]["lesson_frequency"]
            | null
          source_id?: string | null
          source_type?: Database["public"]["Enums"]["agenda_event_source_type"]
          start_date?: string
          start_time?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      agenda_participants: {
        Row: {
          created_at: string
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_agreements: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          duration_minutes: number
          end_date: string | null
          frequency: Database["public"]["Enums"]["lesson_frequency"]
          id: string
          is_active: boolean
          lesson_type_id: string
          notes: string | null
          price_per_lesson: number
          start_date: string
          start_time: string
          student_user_id: string
          teacher_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          duration_minutes: number
          end_date?: string | null
          frequency: Database["public"]["Enums"]["lesson_frequency"]
          id?: string
          is_active?: boolean
          lesson_type_id: string
          notes?: string | null
          price_per_lesson: number
          start_date: string
          start_time: string
          student_user_id: string
          teacher_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          duration_minutes?: number
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["lesson_frequency"]
          id?: string
          is_active?: boolean
          lesson_type_id?: string
          notes?: string | null
          price_per_lesson?: number
          start_date?: string
          start_time?: string
          student_user_id?: string
          teacher_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_agreements_lesson_type_id_fkey"
            columns: ["lesson_type_id"]
            isOneToOne: false
            referencedRelation: "lesson_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_agreements_teacher_user_id_fkey"
            columns: ["teacher_user_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lesson_type_options: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number
          frequency: Database["public"]["Enums"]["lesson_frequency"]
          id: string
          lesson_type_id: string
          price_per_lesson: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes: number
          frequency: Database["public"]["Enums"]["lesson_frequency"]
          id?: string
          lesson_type_id: string
          price_per_lesson: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          frequency?: Database["public"]["Enums"]["lesson_frequency"]
          id?: string
          lesson_type_id?: string
          price_per_lesson?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_type_options_lesson_type_id_fkey"
            columns: ["lesson_type_id"]
            isOneToOne: false
            referencedRelation: "lesson_types"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_types: {
        Row: {
          color: string
          cost_center: string | null
          created_at: string
          created_by: string | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          is_group_lesson: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          is_group_lesson?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_group_lesson?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          email: string
          first_name: string | null
          last_name: string | null
          phone_number: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_domains: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      project_labels: {
        Row: {
          created_at: string
          created_by: string | null
          domain_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          domain_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          domain_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_labels_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "project_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cost_center: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          label_id: string
          name: string
          owner_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label_id: string
          name: string
          owner_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          label_id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "project_labels"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          debtor_address: string | null
          debtor_city: string | null
          debtor_info_same_as_student: boolean
          debtor_name: string | null
          debtor_postal_code: string | null
          parent_email: string | null
          parent_name: string | null
          parent_phone_number: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          debtor_address?: string | null
          debtor_city?: string | null
          debtor_info_same_as_student?: boolean
          debtor_name?: string | null
          debtor_postal_code?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          debtor_address?: string | null
          debtor_city?: string | null
          debtor_info_same_as_student?: boolean
          debtor_name?: string | null
          debtor_postal_code?: string | null
          parent_email?: string | null
          parent_name?: string | null
          parent_phone_number?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      teacher_availability: {
        Row: {
          created_at: string
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          teacher_user_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          teacher_user_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          teacher_user_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_availability_teacher_user_id_fkey"
            columns: ["teacher_user_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teacher_lesson_types: {
        Row: {
          created_at: string
          lesson_type_id: string
          teacher_user_id: string
        }
        Insert: {
          created_at?: string
          lesson_type_id: string
          teacher_user_id: string
        }
        Update: {
          created_at?: string
          lesson_type_id?: string
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_lesson_types_lesson_type_id_fkey"
            columns: ["lesson_type_id"]
            isOneToOne: false
            referencedRelation: "lesson_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_lesson_types_teacher_user_id_fkey"
            columns: ["teacher_user_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["user_id"]
          },
        ]
      }
      teachers: {
        Row: {
          bio: string | null
          created_at: string
          created_by: string | null
          is_active: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          created_by?: string | null
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      view_profiles_with_display_name: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          phone_number: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: never
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: never
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone_number?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      apply_audit_trail: { Args: { p_table: unknown }; Returns: undefined }
      authenticated_has_execute_on: {
        Args: { p_regprocedure: string }
        Returns: boolean
      }
      can_delete_user: { Args: { _target_id: string }; Returns: boolean }
      can_manage_agenda_event: { Args: { ev_id: string }; Returns: boolean }
      check_rls_enabled: { Args: { p_table_name: string }; Returns: boolean }
      check_rls_forced: { Args: { p_table_name: string }; Returns: boolean }
      cleanup_student_if_no_agreements: {
        Args: { _user_id: string }
        Returns: undefined
      }
      current_user_id: { Args: never; Returns: string }
      end_recurring_deviation_from_week: {
        Args: { p_deviation_id: string; p_week_date: string }
        Returns: string
      }
      ensure_student_exists: { Args: { _user_id: string }; Returns: undefined }
      ensure_week_shows_original_slot: {
        Args: { p_event_id: string; p_scope: string; p_week_date: string }
        Returns: string
      }
      function_exists: { Args: { p_regprocedure: string }; Returns: boolean }
      get_agenda_event_owner: { Args: { ev_id: string }; Returns: string }
      get_hours_report: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_teacher_user_id?: string
        }
        Returns: Json
      }
      get_lesson_agreements_paginated: {
        Args: {
          p_is_active?: boolean
          p_lesson_type_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_column?: string
          p_sort_direction?: string
          p_student_user_id?: string
          p_teacher_user_id?: string
        }
        Returns: Json
      }
      get_public_function_pronames: { Args: never; Returns: string[] }
      get_public_table_names: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      get_public_views_security_mode: {
        Args: never
        Returns: {
          security_invoker: boolean
          view_name: string
          view_owner: string
        }[]
      }
      get_student_status: { Args: { _user_id: string }; Returns: string }
      get_students_paginated: {
        Args: {
          p_lesson_type_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_column?: string
          p_sort_direction?: string
          p_status?: string
        }
        Returns: Json
      }
      get_table_policies: { Args: { p_table_name: string }; Returns: string[] }
      get_teacher_user_id: { Args: { _user_id: string }; Returns: string }
      get_teachers_paginated: {
        Args: {
          p_lesson_type_id?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort_column?: string
          p_sort_direction?: string
          p_status?: string
        }
        Returns: Json
      }
      get_users_paginated: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role?: string
          p_search?: string
          p_sort_column?: string
          p_sort_direction?: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_agenda_participant: {
        Args: { ev_id: string; uid: string }
        Returns: boolean
      }
      is_privileged: { Args: never; Returns: boolean }
      is_site_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_student: { Args: { _user_id: string }; Returns: boolean }
      is_teacher: { Args: { _user_id: string }; Returns: boolean }
      is_valid_phone_number: { Args: { p_phone: string }; Returns: boolean }
      policy_exists: {
        Args: { p_policy_name: string; p_table_name: string }
        Returns: boolean
      }
      shift_recurring_deviation_to_next_week: {
        Args: { p_deviation_id: string }
        Returns: string
      }
    }
    Enums: {
      agenda_event_source_type: "manual" | "lesson_agreement" | "project"
      app_role: "site_admin" | "admin" | "staff"
      cancellation_type: "student" | "teacher"
      lesson_frequency: "daily" | "weekly" | "biweekly" | "monthly"
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
      agenda_event_source_type: ["manual", "lesson_agreement", "project"],
      app_role: ["site_admin", "admin", "staff"],
      cancellation_type: ["student", "teacher"],
      lesson_frequency: ["daily", "weekly", "biweekly", "monthly"],
    },
  },
} as const
