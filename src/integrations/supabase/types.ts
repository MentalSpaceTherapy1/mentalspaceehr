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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      practice_locations: {
        Row: {
          city: string
          created_at: string | null
          id: string
          is_active: boolean | null
          location_name: string
          phone_number: string
          place_of_service_code: string | null
          state: string
          street1: string
          street2: string | null
          updated_at: string | null
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_name: string
          phone_number: string
          place_of_service_code?: string | null
          state: string
          street1: string
          street2?: string | null
          updated_at?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location_name?: string
          phone_number?: string
          place_of_service_code?: string | null
          state?: string
          street1?: string
          street2?: string | null
          updated_at?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      practice_settings: {
        Row: {
          allow_note_correction_after_lockout: boolean | null
          billing_city: string | null
          billing_state: string | null
          billing_street1: string | null
          billing_street2: string | null
          billing_zip_code: string | null
          city: string
          county: string | null
          created_at: string | null
          dba: string | null
          default_appointment_duration: number | null
          default_session_types: string[] | null
          documentation_grace_period: number | null
          email_address: string
          fax_number: string | null
          id: string
          logo: string | null
          main_phone_number: string
          note_due_days: number | null
          note_lockout_day: string | null
          note_lockout_time: string | null
          npi_number: string
          office_hours: Json
          practice_name: string
          primary_color: string | null
          require_supervisor_cosign: boolean | null
          requires_insurance_auth: boolean | null
          secondary_color: string | null
          state: string
          street1: string
          street2: string | null
          tax_id: string
          updated_at: string | null
          website: string | null
          zip_code: string
        }
        Insert: {
          allow_note_correction_after_lockout?: boolean | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street1?: string | null
          billing_street2?: string | null
          billing_zip_code?: string | null
          city: string
          county?: string | null
          created_at?: string | null
          dba?: string | null
          default_appointment_duration?: number | null
          default_session_types?: string[] | null
          documentation_grace_period?: number | null
          email_address: string
          fax_number?: string | null
          id?: string
          logo?: string | null
          main_phone_number: string
          note_due_days?: number | null
          note_lockout_day?: string | null
          note_lockout_time?: string | null
          npi_number: string
          office_hours?: Json
          practice_name: string
          primary_color?: string | null
          require_supervisor_cosign?: boolean | null
          requires_insurance_auth?: boolean | null
          secondary_color?: string | null
          state: string
          street1: string
          street2?: string | null
          tax_id: string
          updated_at?: string | null
          website?: string | null
          zip_code: string
        }
        Update: {
          allow_note_correction_after_lockout?: boolean | null
          billing_city?: string | null
          billing_state?: string | null
          billing_street1?: string | null
          billing_street2?: string | null
          billing_zip_code?: string | null
          city?: string
          county?: string | null
          created_at?: string | null
          dba?: string | null
          default_appointment_duration?: number | null
          default_session_types?: string[] | null
          documentation_grace_period?: number | null
          email_address?: string
          fax_number?: string | null
          id?: string
          logo?: string | null
          main_phone_number?: string
          note_due_days?: number | null
          note_lockout_day?: string | null
          note_lockout_time?: string | null
          npi_number?: string
          office_hours?: Json
          practice_name?: string
          primary_color?: string | null
          require_supervisor_cosign?: boolean | null
          requires_insurance_auth?: boolean | null
          secondary_color?: string | null
          state?: string
          street1?: string
          street2?: string | null
          tax_id?: string
          updated_at?: string | null
          website?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_new_patients: boolean | null
          account_created_date: string | null
          available_for_scheduling: boolean | null
          completed_supervision_hours: number | null
          created_at: string | null
          credentials: string[] | null
          dea_number: string | null
          default_office_location: string | null
          default_rate: number | null
          digital_signature: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          hourly_payroll_rate: number | null
          id: string
          is_active: boolean | null
          is_supervisor: boolean | null
          is_under_supervision: boolean | null
          languages_spoken: string[] | null
          last_login_date: string | null
          last_name: string
          license_expiration_date: string | null
          license_number: string | null
          license_state: string | null
          mfa_enabled: boolean | null
          middle_name: string | null
          notification_preferences: Json | null
          npi_number: string | null
          office_extension: string | null
          personal_email: string | null
          phone_number: string | null
          preferred_name: string | null
          profile_completed: boolean | null
          required_supervision_hours: number | null
          requires_password_change: boolean | null
          signature_date: string | null
          specialties: string[] | null
          suffix: string | null
          supervision_end_date: string | null
          supervision_licenses: string[] | null
          supervision_start_date: string | null
          tax_id: string | null
          taxonomy_code: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          account_created_date?: string | null
          available_for_scheduling?: boolean | null
          completed_supervision_hours?: number | null
          created_at?: string | null
          credentials?: string[] | null
          dea_number?: string | null
          default_office_location?: string | null
          default_rate?: number | null
          digital_signature?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          hourly_payroll_rate?: number | null
          id: string
          is_active?: boolean | null
          is_supervisor?: boolean | null
          is_under_supervision?: boolean | null
          languages_spoken?: string[] | null
          last_login_date?: string | null
          last_name: string
          license_expiration_date?: string | null
          license_number?: string | null
          license_state?: string | null
          mfa_enabled?: boolean | null
          middle_name?: string | null
          notification_preferences?: Json | null
          npi_number?: string | null
          office_extension?: string | null
          personal_email?: string | null
          phone_number?: string | null
          preferred_name?: string | null
          profile_completed?: boolean | null
          required_supervision_hours?: number | null
          requires_password_change?: boolean | null
          signature_date?: string | null
          specialties?: string[] | null
          suffix?: string | null
          supervision_end_date?: string | null
          supervision_licenses?: string[] | null
          supervision_start_date?: string | null
          tax_id?: string | null
          taxonomy_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          account_created_date?: string | null
          available_for_scheduling?: boolean | null
          completed_supervision_hours?: number | null
          created_at?: string | null
          credentials?: string[] | null
          dea_number?: string | null
          default_office_location?: string | null
          default_rate?: number | null
          digital_signature?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          hourly_payroll_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_supervisor?: boolean | null
          is_under_supervision?: boolean | null
          languages_spoken?: string[] | null
          last_login_date?: string | null
          last_name?: string
          license_expiration_date?: string | null
          license_number?: string | null
          license_state?: string | null
          mfa_enabled?: boolean | null
          middle_name?: string | null
          notification_preferences?: Json | null
          npi_number?: string | null
          office_extension?: string | null
          personal_email?: string | null
          phone_number?: string | null
          preferred_name?: string | null
          profile_completed?: boolean | null
          required_supervision_hours?: number | null
          requires_password_change?: boolean | null
          signature_date?: string | null
          specialties?: string[] | null
          suffix?: string | null
          supervision_end_date?: string | null
          supervision_licenses?: string[] | null
          supervision_start_date?: string | null
          tax_id?: string | null
          taxonomy_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      supervision_relationships: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          start_date: string
          supervisee_id: string
          supervision_type: string | null
          supervisor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date?: string
          supervisee_id: string
          supervision_type?: string | null
          supervisor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          start_date?: string
          supervisee_id?: string
          supervision_type?: string | null
          supervisor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervision_relationships_supervisee_id_fkey"
            columns: ["supervisee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervision_relationships_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          expires_at: string
          id: string
          ip_address: string | null
          last_used_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_used_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_audit_log: {
        Row: {
          action_type: string
          changes: Json | null
          created_at: string | null
          id: string
          performed_by: string
          user_id: string
        }
        Insert: {
          action_type: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          performed_by: string
          user_id: string
        }
        Update: {
          action_type?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          performed_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_devices: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "administrator"
        | "supervisor"
        | "therapist"
        | "billing_staff"
        | "front_desk"
        | "associate_trainee"
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
        "administrator",
        "supervisor",
        "therapist",
        "billing_staff",
        "front_desk",
        "associate_trainee",
      ],
    },
  },
} as const
