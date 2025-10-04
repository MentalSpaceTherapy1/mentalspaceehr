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
      ai_note_settings: {
        Row: {
          anonymize_before_sending: boolean
          auto_approve_high_confidence: boolean | null
          created_at: string
          data_sharing_consent: boolean
          enabled: boolean
          id: string
          minimum_confidence_threshold: number | null
          model: string
          practice_id: string | null
          provider: string
          require_clinician_review: boolean | null
          retain_ai_logs: boolean
          retention_days: number | null
          risk_assessment_enabled: boolean
          suggestion_engine_enabled: boolean
          template_completion_enabled: boolean
          text_expansion_enabled: boolean
          updated_at: string
          voice_to_text_enabled: boolean
        }
        Insert: {
          anonymize_before_sending?: boolean
          auto_approve_high_confidence?: boolean | null
          created_at?: string
          data_sharing_consent?: boolean
          enabled?: boolean
          id?: string
          minimum_confidence_threshold?: number | null
          model?: string
          practice_id?: string | null
          provider?: string
          require_clinician_review?: boolean | null
          retain_ai_logs?: boolean
          retention_days?: number | null
          risk_assessment_enabled?: boolean
          suggestion_engine_enabled?: boolean
          template_completion_enabled?: boolean
          text_expansion_enabled?: boolean
          updated_at?: string
          voice_to_text_enabled?: boolean
        }
        Update: {
          anonymize_before_sending?: boolean
          auto_approve_high_confidence?: boolean | null
          created_at?: string
          data_sharing_consent?: boolean
          enabled?: boolean
          id?: string
          minimum_confidence_threshold?: number | null
          model?: string
          practice_id?: string | null
          provider?: string
          require_clinician_review?: boolean | null
          retain_ai_logs?: boolean
          retention_days?: number | null
          risk_assessment_enabled?: boolean
          suggestion_engine_enabled?: boolean
          template_completion_enabled?: boolean
          text_expansion_enabled?: boolean
          updated_at?: string
          voice_to_text_enabled?: boolean
        }
        Relationships: []
      }
      ai_provider_baa: {
        Row: {
          baa_document_url: string | null
          baa_expiration_date: string | null
          baa_signed: boolean
          baa_signed_date: string | null
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          provider_name: string
          updated_at: string
        }
        Insert: {
          baa_document_url?: string | null
          baa_expiration_date?: string | null
          baa_signed?: boolean
          baa_signed_date?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          provider_name: string
          updated_at?: string
        }
        Update: {
          baa_document_url?: string | null
          baa_expiration_date?: string | null
          baa_signed?: boolean
          baa_signed_date?: string | null
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          provider_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_request_logs: {
        Row: {
          anonymized_input_hash: string | null
          confidence_score: number | null
          created_at: string
          error_message: string | null
          id: string
          input_length: number | null
          model_used: string
          output_length: number | null
          processing_time_ms: number | null
          request_type: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          anonymized_input_hash?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_length?: number | null
          model_used: string
          output_length?: number | null
          processing_time_ms?: number | null
          request_type: string
          success?: boolean
          user_id?: string | null
        }
        Update: {
          anonymized_input_hash?: string | null
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_length?: number | null
          model_used?: string
          output_length?: number | null
          processing_time_ms?: number | null
          request_type?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      appointment_change_logs: {
        Row: {
          action: string
          appointment_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_change_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_notification_settings: {
        Row: {
          cancelled_subject: string
          cancelled_template: string
          created_at: string
          created_subject: string
          created_template: string
          id: string
          notify_recipients: Json
          practice_id: string | null
          respect_client_preferences: boolean
          send_on_cancel: boolean
          send_on_create: boolean
          send_on_update: boolean
          updated_at: string
          updated_subject: string
          updated_template: string
        }
        Insert: {
          cancelled_subject?: string
          cancelled_template?: string
          created_at?: string
          created_subject?: string
          created_template?: string
          id?: string
          notify_recipients?: Json
          practice_id?: string | null
          respect_client_preferences?: boolean
          send_on_cancel?: boolean
          send_on_create?: boolean
          send_on_update?: boolean
          updated_at?: string
          updated_subject?: string
          updated_template?: string
        }
        Update: {
          cancelled_subject?: string
          cancelled_template?: string
          created_at?: string
          created_subject?: string
          created_template?: string
          id?: string
          notify_recipients?: Json
          practice_id?: string | null
          respect_client_preferences?: boolean
          send_on_cancel?: boolean
          send_on_create?: boolean
          send_on_update?: boolean
          updated_at?: string
          updated_subject?: string
          updated_template?: string
        }
        Relationships: []
      }
      appointment_notifications: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_participants: {
        Row: {
          added_by: string | null
          added_date: string | null
          appointment_id: string
          client_id: string
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          added_by?: string | null
          added_date?: string | null
          appointment_id: string
          client_id: string
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          added_by?: string | null
          added_date?: string | null
          appointment_id?: string
          client_id?: string
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_participants_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_waitlist: {
        Row: {
          added_by: string | null
          added_date: string | null
          alternate_clinician_ids: string[] | null
          appointment_type: string
          client_id: string
          clinician_id: string | null
          contacted_by: string | null
          contacted_date: string | null
          id: string
          notes: string | null
          notified: boolean | null
          notified_date: string | null
          preferred_days: string[] | null
          preferred_times: string[] | null
          priority: string | null
          removed_date: string | null
          removed_reason: string | null
          scheduled_appointment_id: string | null
          status: string | null
        }
        Insert: {
          added_by?: string | null
          added_date?: string | null
          alternate_clinician_ids?: string[] | null
          appointment_type: string
          client_id: string
          clinician_id?: string | null
          contacted_by?: string | null
          contacted_date?: string | null
          id?: string
          notes?: string | null
          notified?: boolean | null
          notified_date?: string | null
          preferred_days?: string[] | null
          preferred_times?: string[] | null
          priority?: string | null
          removed_date?: string | null
          removed_reason?: string | null
          scheduled_appointment_id?: string | null
          status?: string | null
        }
        Update: {
          added_by?: string | null
          added_date?: string | null
          alternate_clinician_ids?: string[] | null
          appointment_type?: string
          client_id?: string
          clinician_id?: string | null
          contacted_by?: string | null
          contacted_date?: string | null
          id?: string
          notes?: string | null
          notified?: boolean | null
          notified_date?: string | null
          preferred_days?: string[] | null
          preferred_times?: string[] | null
          priority?: string | null
          removed_date?: string | null
          removed_reason?: string | null
          scheduled_appointment_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_waitlist_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_contacted_by_fkey"
            columns: ["contacted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_waitlist_scheduled_appointment_id_fkey"
            columns: ["scheduled_appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          actual_duration: number | null
          appointment_date: string
          appointment_notes: string | null
          appointment_type: string
          billing_status: string
          cancellation_date: string | null
          cancellation_fee_applied: boolean | null
          cancellation_notes: string | null
          cancellation_reason: string | null
          cancelled_by: string | null
          charge_amount: number | null
          checked_in_by: string | null
          checked_in_time: string | null
          checked_out_by: string | null
          checked_out_time: string | null
          client_id: string
          client_notes: string | null
          clinician_id: string
          cpt_code: string | null
          created_by: string | null
          created_date: string | null
          current_participants: number | null
          duration: number
          end_time: string
          icd_codes: string[] | null
          id: string
          is_group_session: boolean | null
          is_recurring: boolean | null
          last_modified: string | null
          last_modified_by: string | null
          max_participants: number | null
          no_show_date: string | null
          no_show_fee_applied: boolean | null
          no_show_notes: string | null
          office_location_id: string | null
          parent_recurrence_id: string | null
          recurrence_pattern: Json | null
          reminder_confirmation_token: string | null
          reminder_confirmed: boolean | null
          reminder_confirmed_at: string | null
          reminders_sent: Json | null
          room: string | null
          service_location: string
          start_time: string
          status: string
          status_updated_by: string | null
          status_updated_date: string | null
          telehealth_link: string | null
          telehealth_platform: string | null
          timezone: string
        }
        Insert: {
          actual_duration?: number | null
          appointment_date: string
          appointment_notes?: string | null
          appointment_type: string
          billing_status?: string
          cancellation_date?: string | null
          cancellation_fee_applied?: boolean | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          charge_amount?: number | null
          checked_in_by?: string | null
          checked_in_time?: string | null
          checked_out_by?: string | null
          checked_out_time?: string | null
          client_id: string
          client_notes?: string | null
          clinician_id: string
          cpt_code?: string | null
          created_by?: string | null
          created_date?: string | null
          current_participants?: number | null
          duration: number
          end_time: string
          icd_codes?: string[] | null
          id?: string
          is_group_session?: boolean | null
          is_recurring?: boolean | null
          last_modified?: string | null
          last_modified_by?: string | null
          max_participants?: number | null
          no_show_date?: string | null
          no_show_fee_applied?: boolean | null
          no_show_notes?: string | null
          office_location_id?: string | null
          parent_recurrence_id?: string | null
          recurrence_pattern?: Json | null
          reminder_confirmation_token?: string | null
          reminder_confirmed?: boolean | null
          reminder_confirmed_at?: string | null
          reminders_sent?: Json | null
          room?: string | null
          service_location: string
          start_time: string
          status?: string
          status_updated_by?: string | null
          status_updated_date?: string | null
          telehealth_link?: string | null
          telehealth_platform?: string | null
          timezone?: string
        }
        Update: {
          actual_duration?: number | null
          appointment_date?: string
          appointment_notes?: string | null
          appointment_type?: string
          billing_status?: string
          cancellation_date?: string | null
          cancellation_fee_applied?: boolean | null
          cancellation_notes?: string | null
          cancellation_reason?: string | null
          cancelled_by?: string | null
          charge_amount?: number | null
          checked_in_by?: string | null
          checked_in_time?: string | null
          checked_out_by?: string | null
          checked_out_time?: string | null
          client_id?: string
          client_notes?: string | null
          clinician_id?: string
          cpt_code?: string | null
          created_by?: string | null
          created_date?: string | null
          current_participants?: number | null
          duration?: number
          end_time?: string
          icd_codes?: string[] | null
          id?: string
          is_group_session?: boolean | null
          is_recurring?: boolean | null
          last_modified?: string | null
          last_modified_by?: string | null
          max_participants?: number | null
          no_show_date?: string | null
          no_show_fee_applied?: boolean | null
          no_show_notes?: string | null
          office_location_id?: string | null
          parent_recurrence_id?: string | null
          recurrence_pattern?: Json | null
          reminder_confirmation_token?: string | null
          reminder_confirmed?: boolean | null
          reminder_confirmed_at?: string | null
          reminders_sent?: Json | null
          room?: string | null
          service_location?: string
          start_time?: string
          status?: string
          status_updated_by?: string | null
          status_updated_date?: string | null
          telehealth_link?: string | null
          telehealth_platform?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_last_modified_by_fkey"
            columns: ["last_modified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_office_location_id_fkey"
            columns: ["office_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_parent_recurrence_id_fkey"
            columns: ["parent_recurrence_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_status_updated_by_fkey"
            columns: ["status_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          block_type: string
          clinician_id: string
          created_by: string | null
          created_date: string | null
          end_date: string
          end_time: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          recurrence_pattern: Json | null
          start_date: string
          start_time: string
          title: string
        }
        Insert: {
          block_type: string
          clinician_id: string
          created_by?: string | null
          created_date?: string | null
          end_date: string
          end_time: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_pattern?: Json | null
          start_date: string
          start_time: string
          title: string
        }
        Update: {
          block_type?: string
          clinician_id?: string
          created_by?: string | null
          created_date?: string | null
          end_date?: string
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          recurrence_pattern?: Json | null
          start_date?: string
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_insurance: {
        Row: {
          back_card_image: string | null
          claims_address: Json | null
          client_id: string
          coinsurance: number | null
          copay: number | null
          created_at: string | null
          created_by: string | null
          customer_service_phone: string
          deductible: number | null
          deductible_met: number | null
          effective_date: string
          front_card_image: string | null
          group_number: string | null
          id: string
          insurance_company: string
          insurance_company_id: string | null
          last_verification_date: string | null
          last_verified_by: string | null
          member_id: string
          mental_health_coverage: boolean | null
          out_of_pocket_max: number | null
          out_of_pocket_met: number | null
          plan_name: string
          plan_type: string
          precertification_phone: string | null
          provider_phone: string | null
          rank: string
          relationship_to_subscriber: string | null
          remaining_sessions_this_year: number | null
          requires_prior_auth: boolean | null
          requires_referral: boolean | null
          subscriber_address: Json | null
          subscriber_dob: string | null
          subscriber_employer: string | null
          subscriber_first_name: string | null
          subscriber_is_client: boolean | null
          subscriber_last_name: string | null
          subscriber_ssn: string | null
          termination_date: string | null
          updated_at: string | null
          updated_by: string | null
          verification_notes: string | null
        }
        Insert: {
          back_card_image?: string | null
          claims_address?: Json | null
          client_id: string
          coinsurance?: number | null
          copay?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_service_phone: string
          deductible?: number | null
          deductible_met?: number | null
          effective_date: string
          front_card_image?: string | null
          group_number?: string | null
          id?: string
          insurance_company: string
          insurance_company_id?: string | null
          last_verification_date?: string | null
          last_verified_by?: string | null
          member_id: string
          mental_health_coverage?: boolean | null
          out_of_pocket_max?: number | null
          out_of_pocket_met?: number | null
          plan_name: string
          plan_type: string
          precertification_phone?: string | null
          provider_phone?: string | null
          rank: string
          relationship_to_subscriber?: string | null
          remaining_sessions_this_year?: number | null
          requires_prior_auth?: boolean | null
          requires_referral?: boolean | null
          subscriber_address?: Json | null
          subscriber_dob?: string | null
          subscriber_employer?: string | null
          subscriber_first_name?: string | null
          subscriber_is_client?: boolean | null
          subscriber_last_name?: string | null
          subscriber_ssn?: string | null
          termination_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_notes?: string | null
        }
        Update: {
          back_card_image?: string | null
          claims_address?: Json | null
          client_id?: string
          coinsurance?: number | null
          copay?: number | null
          created_at?: string | null
          created_by?: string | null
          customer_service_phone?: string
          deductible?: number | null
          deductible_met?: number | null
          effective_date?: string
          front_card_image?: string | null
          group_number?: string | null
          id?: string
          insurance_company?: string
          insurance_company_id?: string | null
          last_verification_date?: string | null
          last_verified_by?: string | null
          member_id?: string
          mental_health_coverage?: boolean | null
          out_of_pocket_max?: number | null
          out_of_pocket_met?: number | null
          plan_name?: string
          plan_type?: string
          precertification_phone?: string | null
          provider_phone?: string | null
          rank?: string
          relationship_to_subscriber?: string | null
          remaining_sessions_this_year?: number | null
          requires_prior_auth?: boolean | null
          requires_referral?: boolean | null
          subscriber_address?: Json | null
          subscriber_dob?: string | null
          subscriber_employer?: string | null
          subscriber_first_name?: string | null
          subscriber_is_client?: boolean | null
          subscriber_last_name?: string | null
          subscriber_ssn?: string | null
          termination_date?: string | null
          updated_at?: string | null
          updated_by?: string | null
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_insurance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_insurance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_insurance_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_insurance_last_verified_by_fkey"
            columns: ["last_verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_insurance_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accessibility_needs: string[] | null
          allergy_alerts: string[] | null
          case_manager_id: string | null
          city: string
          consents: Json | null
          county: string | null
          created_at: string | null
          created_by: string | null
          date_of_birth: string
          deceased_date: string | null
          discharge_date: string | null
          discharge_reason: string | null
          education: string | null
          email: string | null
          employer: string | null
          employment_status: string | null
          ethnicity: string | null
          first_name: string
          gender: string | null
          gender_identity: string | null
          guarantor: Json | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relationship: string | null
          housing_status: string | null
          id: string
          interpreter_language: string | null
          is_temporary_address: boolean | null
          is_veteran: boolean | null
          last_name: string
          legal_status: string | null
          living_arrangement: string | null
          mailing_address: Json | null
          marital_status: string | null
          medical_record_number: string
          middle_name: string | null
          military_branch: string | null
          military_discharge_type: string | null
          needs_interpreter: boolean | null
          occupation: string | null
          okay_to_leave_message: boolean | null
          other_languages_spoken: string[] | null
          preferred_contact_method: string | null
          preferred_name: string | null
          preferred_pharmacy: Json | null
          previous_mrn: string | null
          previous_names: string[] | null
          previous_system_name: string | null
          primary_care_provider: Json | null
          primary_language: string | null
          primary_phone: string
          primary_phone_type: string | null
          primary_therapist_id: string | null
          pronouns: string | null
          psychiatrist_id: string | null
          race: string[] | null
          referring_provider: Json | null
          registration_date: string | null
          religion: string | null
          secondary_phone: string | null
          secondary_phone_type: string | null
          sex_assigned_at_birth: string | null
          sexual_orientation: string | null
          special_needs: string | null
          state: string
          status: string
          status_date: string | null
          street1: string
          street2: string | null
          suffix: string | null
          temporary_until: string | null
          updated_at: string | null
          updated_by: string | null
          zip_code: string
        }
        Insert: {
          accessibility_needs?: string[] | null
          allergy_alerts?: string[] | null
          case_manager_id?: string | null
          city: string
          consents?: Json | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth: string
          deceased_date?: string | null
          discharge_date?: string | null
          discharge_reason?: string | null
          education?: string | null
          email?: string | null
          employer?: string | null
          employment_status?: string | null
          ethnicity?: string | null
          first_name: string
          gender?: string | null
          gender_identity?: string | null
          guarantor?: Json | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          housing_status?: string | null
          id?: string
          interpreter_language?: string | null
          is_temporary_address?: boolean | null
          is_veteran?: boolean | null
          last_name: string
          legal_status?: string | null
          living_arrangement?: string | null
          mailing_address?: Json | null
          marital_status?: string | null
          medical_record_number: string
          middle_name?: string | null
          military_branch?: string | null
          military_discharge_type?: string | null
          needs_interpreter?: boolean | null
          occupation?: string | null
          okay_to_leave_message?: boolean | null
          other_languages_spoken?: string[] | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          preferred_pharmacy?: Json | null
          previous_mrn?: string | null
          previous_names?: string[] | null
          previous_system_name?: string | null
          primary_care_provider?: Json | null
          primary_language?: string | null
          primary_phone: string
          primary_phone_type?: string | null
          primary_therapist_id?: string | null
          pronouns?: string | null
          psychiatrist_id?: string | null
          race?: string[] | null
          referring_provider?: Json | null
          registration_date?: string | null
          religion?: string | null
          secondary_phone?: string | null
          secondary_phone_type?: string | null
          sex_assigned_at_birth?: string | null
          sexual_orientation?: string | null
          special_needs?: string | null
          state: string
          status?: string
          status_date?: string | null
          street1: string
          street2?: string | null
          suffix?: string | null
          temporary_until?: string | null
          updated_at?: string | null
          updated_by?: string | null
          zip_code: string
        }
        Update: {
          accessibility_needs?: string[] | null
          allergy_alerts?: string[] | null
          case_manager_id?: string | null
          city?: string
          consents?: Json | null
          county?: string | null
          created_at?: string | null
          created_by?: string | null
          date_of_birth?: string
          deceased_date?: string | null
          discharge_date?: string | null
          discharge_reason?: string | null
          education?: string | null
          email?: string | null
          employer?: string | null
          employment_status?: string | null
          ethnicity?: string | null
          first_name?: string
          gender?: string | null
          gender_identity?: string | null
          guarantor?: Json | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relationship?: string | null
          housing_status?: string | null
          id?: string
          interpreter_language?: string | null
          is_temporary_address?: boolean | null
          is_veteran?: boolean | null
          last_name?: string
          legal_status?: string | null
          living_arrangement?: string | null
          mailing_address?: Json | null
          marital_status?: string | null
          medical_record_number?: string
          middle_name?: string | null
          military_branch?: string | null
          military_discharge_type?: string | null
          needs_interpreter?: boolean | null
          occupation?: string | null
          okay_to_leave_message?: boolean | null
          other_languages_spoken?: string[] | null
          preferred_contact_method?: string | null
          preferred_name?: string | null
          preferred_pharmacy?: Json | null
          previous_mrn?: string | null
          previous_names?: string[] | null
          previous_system_name?: string | null
          primary_care_provider?: Json | null
          primary_language?: string | null
          primary_phone?: string
          primary_phone_type?: string | null
          primary_therapist_id?: string | null
          pronouns?: string | null
          psychiatrist_id?: string | null
          race?: string[] | null
          referring_provider?: Json | null
          registration_date?: string | null
          religion?: string | null
          secondary_phone?: string | null
          secondary_phone_type?: string | null
          sex_assigned_at_birth?: string | null
          sexual_orientation?: string | null
          special_needs?: string | null
          state?: string
          status?: string
          status_date?: string | null
          street1?: string
          street2?: string | null
          suffix?: string | null
          temporary_until?: string | null
          updated_at?: string | null
          updated_by?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_case_manager_id_fkey"
            columns: ["case_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_therapist_id_fkey"
            columns: ["primary_therapist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_psychiatrist_id_fkey"
            columns: ["psychiatrist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_notes: {
        Row: {
          ai_confidence_score: number | null
          ai_generated: boolean
          ai_generation_status:
            | Database["public"]["Enums"]["ai_generation_status"]
            | null
          ai_model_used: string | null
          ai_processing_time_ms: number | null
          appointment_id: string | null
          billing_status: string | null
          client_id: string
          clinician_id: string
          content: Json
          cpt_codes: string[] | null
          created_at: string
          created_by: string
          date_of_service: string
          diagnoses: string[] | null
          id: string
          interventions: string[] | null
          locked: boolean | null
          locked_by: string | null
          locked_date: string | null
          medications_discussed: string[] | null
          note_format: Database["public"]["Enums"]["note_format"]
          note_type: Database["public"]["Enums"]["note_type"]
          requires_supervision: boolean | null
          risk_flags: Json | null
          risk_severity: string | null
          safety_plan_id: string | null
          safety_plan_triggered: boolean | null
          safety_plan_updated: boolean | null
          session_duration_minutes: number | null
          session_id: string | null
          supervised_by: string | null
          supervision_date: string | null
          supervision_notes: string | null
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          ai_confidence_score?: number | null
          ai_generated?: boolean
          ai_generation_status?:
            | Database["public"]["Enums"]["ai_generation_status"]
            | null
          ai_model_used?: string | null
          ai_processing_time_ms?: number | null
          appointment_id?: string | null
          billing_status?: string | null
          client_id: string
          clinician_id: string
          content?: Json
          cpt_codes?: string[] | null
          created_at?: string
          created_by: string
          date_of_service: string
          diagnoses?: string[] | null
          id?: string
          interventions?: string[] | null
          locked?: boolean | null
          locked_by?: string | null
          locked_date?: string | null
          medications_discussed?: string[] | null
          note_format?: Database["public"]["Enums"]["note_format"]
          note_type: Database["public"]["Enums"]["note_type"]
          requires_supervision?: boolean | null
          risk_flags?: Json | null
          risk_severity?: string | null
          safety_plan_id?: string | null
          safety_plan_triggered?: boolean | null
          safety_plan_updated?: boolean | null
          session_duration_minutes?: number | null
          session_id?: string | null
          supervised_by?: string | null
          supervision_date?: string | null
          supervision_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          ai_confidence_score?: number | null
          ai_generated?: boolean
          ai_generation_status?:
            | Database["public"]["Enums"]["ai_generation_status"]
            | null
          ai_model_used?: string | null
          ai_processing_time_ms?: number | null
          appointment_id?: string | null
          billing_status?: string | null
          client_id?: string
          clinician_id?: string
          content?: Json
          cpt_codes?: string[] | null
          created_at?: string
          created_by?: string
          date_of_service?: string
          diagnoses?: string[] | null
          id?: string
          interventions?: string[] | null
          locked?: boolean | null
          locked_by?: string | null
          locked_date?: string | null
          medications_discussed?: string[] | null
          note_format?: Database["public"]["Enums"]["note_format"]
          note_type?: Database["public"]["Enums"]["note_type"]
          requires_supervision?: boolean | null
          risk_flags?: Json | null
          risk_severity?: string | null
          safety_plan_id?: string | null
          safety_plan_triggered?: boolean | null
          safety_plan_updated?: boolean | null
          session_duration_minutes?: number | null
          session_id?: string | null
          supervised_by?: string | null
          supervision_date?: string | null
          supervision_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_safety_plan_id_fkey"
            columns: ["safety_plan_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_supervised_by_fkey"
            columns: ["supervised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          address: string | null
          alternate_phone: string | null
          client_id: string
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          okay_to_discuss_health_info: boolean | null
          okay_to_leave_message: boolean | null
          phone: string
          relationship: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          alternate_phone?: string | null
          client_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          okay_to_discuss_health_info?: boolean | null
          okay_to_leave_message?: boolean | null
          phone: string
          relationship: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          alternate_phone?: string | null
          client_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          okay_to_discuss_health_info?: boolean | null
          okay_to_leave_message?: boolean | null
          phone?: string
          relationship?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_clients: {
        Row: {
          client_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          claims_address: Json | null
          created_at: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          claims_address?: Json | null
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          claims_address?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      note_feedback: {
        Row: {
          ai_sections_kept: Json | null
          clinician_id: string
          created_at: string
          edit_distance: number | null
          feedback_text: string | null
          id: string
          note_id: string
          rating: number | null
        }
        Insert: {
          ai_sections_kept?: Json | null
          clinician_id: string
          created_at?: string
          edit_distance?: number | null
          feedback_text?: string | null
          id?: string
          note_id: string
          rating?: number | null
        }
        Update: {
          ai_sections_kept?: Json | null
          clinician_id?: string
          created_at?: string
          edit_distance?: number | null
          feedback_text?: string | null
          id?: string
          note_id?: string
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "note_feedback_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_templates: {
        Row: {
          ai_prompts: Json | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          note_format: Database["public"]["Enums"]["note_format"]
          note_type: Database["public"]["Enums"]["note_type"]
          template_structure: Json
          updated_at: string
        }
        Insert: {
          ai_prompts?: Json | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          note_format: Database["public"]["Enums"]["note_format"]
          note_type: Database["public"]["Enums"]["note_type"]
          template_structure: Json
          updated_at?: string
        }
        Update: {
          ai_prompts?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          note_format?: Database["public"]["Enums"]["note_format"]
          note_type?: Database["public"]["Enums"]["note_type"]
          template_structure?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          change_summary: string | null
          content: Json
          created_at: string
          created_by: string
          diagnoses: string[] | null
          id: string
          interventions: string[] | null
          is_ai_generated: boolean
          note_id: string
          risk_flags: Json | null
          version: number
        }
        Insert: {
          change_summary?: string | null
          content: Json
          created_at?: string
          created_by: string
          diagnoses?: string[] | null
          id?: string
          interventions?: string[] | null
          is_ai_generated?: boolean
          note_id: string
          risk_flags?: Json | null
          version: number
        }
        Update: {
          change_summary?: string | null
          content?: Json
          created_at?: string
          created_by?: string
          diagnoses?: string[] | null
          id?: string
          interventions?: string[] | null
          is_ai_generated?: boolean
          note_id?: string
          risk_flags?: Json | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
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
          dashboard_settings: Json | null
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
          schedule_settings: Json | null
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
          dashboard_settings?: Json | null
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
          schedule_settings?: Json | null
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
          dashboard_settings?: Json | null
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
          schedule_settings?: Json | null
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
          supervisor_id: string | null
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
          supervisor_id?: string | null
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
          supervisor_id?: string | null
          tax_id?: string | null
          taxonomy_code?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recently_viewed_clients: {
        Row: {
          client_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          client_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_logs: {
        Row: {
          appointment_id: string | null
          confirmed_at: string | null
          created_at: string | null
          error_message: string | null
          hours_before: number
          id: string
          recipient: string
          reminder_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          hours_before: number
          id?: string
          recipient: string
          reminder_type: string
          sent_at?: string | null
          status: string
        }
        Update: {
          appointment_id?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          hours_before?: number
          id?: string
          recipient?: string
          reminder_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          email_template: string | null
          email_timing: number[] | null
          enabled: boolean | null
          id: string
          include_cancel_link: boolean | null
          include_reschedule_link: boolean | null
          practice_id: string | null
          require_confirmation: boolean | null
          sms_enabled: boolean | null
          sms_template: string | null
          sms_timing: number[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_template?: string | null
          email_timing?: number[] | null
          enabled?: boolean | null
          id?: string
          include_cancel_link?: boolean | null
          include_reschedule_link?: boolean | null
          practice_id?: string | null
          require_confirmation?: boolean | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          sms_timing?: number[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          email_template?: string | null
          email_timing?: number[] | null
          enabled?: boolean | null
          id?: string
          include_cancel_link?: boolean | null
          include_reschedule_link?: boolean | null
          practice_id?: string | null
          require_confirmation?: boolean | null
          sms_enabled?: boolean | null
          sms_template?: string | null
          sms_timing?: number[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practice_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_modifiers: string | null
          description: string
          duration_minutes: number | null
          id: string
          include_in_claims: boolean
          is_active: boolean
          is_addon: boolean
          is_default_for_type: boolean
          service_type: string
          standard_rate: number | null
          time_units_billing: string
          time_units_minutes: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_modifiers?: string | null
          description: string
          duration_minutes?: number | null
          id?: string
          include_in_claims?: boolean
          is_active?: boolean
          is_addon?: boolean
          is_default_for_type?: boolean
          service_type: string
          standard_rate?: number | null
          time_units_billing?: string
          time_units_minutes?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_modifiers?: string | null
          description?: string
          duration_minutes?: number | null
          id?: string
          include_in_claims?: boolean
          is_active?: boolean
          is_addon?: boolean
          is_default_for_type?: boolean
          service_type?: string
          standard_rate?: number | null
          time_units_billing?: string
          time_units_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          connection_quality: Json | null
          connection_state: string
          created_at: string | null
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          is_muted: boolean | null
          is_screen_sharing: boolean | null
          is_video_enabled: boolean | null
          joined_at: string | null
          left_at: string | null
          participant_name: string
          participant_role: string
          session_id: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          connection_quality?: Json | null
          connection_state?: string
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_name: string
          participant_role: string
          session_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          connection_quality?: Json | null
          connection_state?: string
          created_at?: string | null
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          is_muted?: boolean | null
          is_screen_sharing?: boolean | null
          is_video_enabled?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          participant_name?: string
          participant_role?: string
          session_id?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_recordings: {
        Row: {
          consent_device_fingerprint: string
          consent_granted_by: string
          consent_ip_address: string
          consent_timestamp: string
          consent_user_agent: string
          created_at: string | null
          duration_seconds: number | null
          encryption_key_id: string | null
          file_size_bytes: number | null
          hipaa_compliant: boolean | null
          id: string
          recording_url: string
          session_id: string | null
          started_at: string
          stopped_at: string | null
        }
        Insert: {
          consent_device_fingerprint: string
          consent_granted_by: string
          consent_ip_address: string
          consent_timestamp: string
          consent_user_agent: string
          created_at?: string | null
          duration_seconds?: number | null
          encryption_key_id?: string | null
          file_size_bytes?: number | null
          hipaa_compliant?: boolean | null
          id?: string
          recording_url: string
          session_id?: string | null
          started_at: string
          stopped_at?: string | null
        }
        Update: {
          consent_device_fingerprint?: string
          consent_granted_by?: string
          consent_ip_address?: string
          consent_timestamp?: string
          consent_user_agent?: string
          created_at?: string | null
          duration_seconds?: number | null
          encryption_key_id?: string | null
          file_size_bytes?: number | null
          hipaa_compliant?: boolean | null
          id?: string
          recording_url?: string
          session_id?: string | null
          started_at?: string
          stopped_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcriptions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          recording_id: string | null
          session_id: string | null
          speaker_id: string | null
          speaker_role: string | null
          timestamp_end: string | null
          timestamp_start: string
          transcript_text: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recording_id?: string | null
          session_id?: string | null
          speaker_id?: string | null
          speaker_role?: string | null
          timestamp_end?: string | null
          timestamp_start: string
          transcript_text: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          recording_id?: string | null
          session_id?: string | null
          speaker_id?: string | null
          speaker_role?: string | null
          timestamp_end?: string | null
          timestamp_start?: string
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_transcriptions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "session_recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_transcriptions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_transcripts: {
        Row: {
          audio_quality_score: number | null
          created_at: string
          id: string
          note_id: string | null
          processing_status: string | null
          session_id: string | null
          speaker_labels: Json | null
          transcript_text: string
        }
        Insert: {
          audio_quality_score?: number | null
          created_at?: string
          id?: string
          note_id?: string | null
          processing_status?: string | null
          session_id?: string | null
          speaker_labels?: Json | null
          transcript_text: string
        }
        Update: {
          audio_quality_score?: number | null
          created_at?: string
          id?: string
          note_id?: string | null
          processing_status?: string | null
          session_id?: string | null
          speaker_labels?: Json | null
          transcript_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_transcripts_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_transcripts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_shares: {
        Row: {
          created_at: string | null
          id: string
          shared_by_user_id: string
          shared_with_user_id: string
          task_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          shared_by_user_id: string
          shared_with_user_id: string
          task_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          shared_by_user_id?: string
          shared_with_user_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_shares_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          category: string
          completed_date: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean | null
          priority: string
          recurrence_pattern: string | null
          related_client_id: string | null
          related_note_id: string | null
          reminder_date: string | null
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          completed_date?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          priority: string
          recurrence_pattern?: string | null
          related_client_id?: string | null
          related_note_id?: string | null
          reminder_date?: string | null
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          completed_date?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean | null
          priority?: string
          recurrence_pattern?: string | null
          related_client_id?: string | null
          related_note_id?: string | null
          reminder_date?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      telehealth_security_events: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          event_description: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          session_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          event_description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          event_description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          session_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_security_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telehealth_sessions: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          current_participant_count: number | null
          duration_seconds: number | null
          ended_at: string | null
          host_id: string
          id: string
          max_participants: number | null
          recording_consent_given: boolean | null
          recording_enabled: boolean | null
          recording_url: string | null
          session_id: string
          session_metadata: Json | null
          started_at: string | null
          status: string
          transcript_enabled: boolean | null
          updated_at: string | null
          waiting_room_enabled: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          current_participant_count?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          host_id: string
          id?: string
          max_participants?: number | null
          recording_consent_given?: boolean | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          session_id: string
          session_metadata?: Json | null
          started_at?: string | null
          status?: string
          transcript_enabled?: boolean | null
          updated_at?: string | null
          waiting_room_enabled?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          current_participant_count?: number | null
          duration_seconds?: number | null
          ended_at?: string | null
          host_id?: string
          id?: string
          max_participants?: number | null
          recording_consent_given?: boolean | null
          recording_enabled?: boolean | null
          recording_url?: string | null
          session_id?: string
          session_metadata?: Json | null
          started_at?: string | null
          status?: string
          transcript_enabled?: boolean | null
          updated_at?: string | null
          waiting_room_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          anticipated_discharge_date: string | null
          barriers: string[] | null
          barriers_identified: boolean | null
          client_agreement: boolean | null
          client_id: string
          client_signature: string | null
          client_signature_date: string | null
          client_strengths: string[] | null
          clinician_id: string
          community_resources: string[] | null
          created_date: string
          diagnoses: Json
          digital_signature: string | null
          discharge_criteria: string[] | null
          effective_date: string
          goals: Json
          id: string
          last_modified: string
          last_modified_by: string | null
          medication_plan: Json | null
          next_review_date: string | null
          plan_date: string
          plan_to_address_barriers: string | null
          previous_version_id: string | null
          problems: Json
          progress_summary: string | null
          psychoeducation_topics: string[] | null
          requires_supervisor_cosign: boolean | null
          review_date: string
          signed_by: string | null
          signed_date: string | null
          status: string
          supervisor_cosign_date: string | null
          supervisor_cosigned: boolean | null
          supervisor_id: string | null
          supervisor_signature: string | null
          support_systems: string[] | null
          treatment_modalities: Json
          version_number: number
        }
        Insert: {
          anticipated_discharge_date?: string | null
          barriers?: string[] | null
          barriers_identified?: boolean | null
          client_agreement?: boolean | null
          client_id: string
          client_signature?: string | null
          client_signature_date?: string | null
          client_strengths?: string[] | null
          clinician_id: string
          community_resources?: string[] | null
          created_date?: string
          diagnoses?: Json
          digital_signature?: string | null
          discharge_criteria?: string[] | null
          effective_date: string
          goals?: Json
          id?: string
          last_modified?: string
          last_modified_by?: string | null
          medication_plan?: Json | null
          next_review_date?: string | null
          plan_date: string
          plan_to_address_barriers?: string | null
          previous_version_id?: string | null
          problems?: Json
          progress_summary?: string | null
          psychoeducation_topics?: string[] | null
          requires_supervisor_cosign?: boolean | null
          review_date: string
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          supervisor_cosign_date?: string | null
          supervisor_cosigned?: boolean | null
          supervisor_id?: string | null
          supervisor_signature?: string | null
          support_systems?: string[] | null
          treatment_modalities?: Json
          version_number?: number
        }
        Update: {
          anticipated_discharge_date?: string | null
          barriers?: string[] | null
          barriers_identified?: boolean | null
          client_agreement?: boolean | null
          client_id?: string
          client_signature?: string | null
          client_signature_date?: string | null
          client_strengths?: string[] | null
          clinician_id?: string
          community_resources?: string[] | null
          created_date?: string
          diagnoses?: Json
          digital_signature?: string | null
          discharge_criteria?: string[] | null
          effective_date?: string
          goals?: Json
          id?: string
          last_modified?: string
          last_modified_by?: string | null
          medication_plan?: Json | null
          next_review_date?: string | null
          plan_date?: string
          plan_to_address_barriers?: string | null
          previous_version_id?: string | null
          problems?: Json
          progress_summary?: string | null
          psychoeducation_topics?: string[] | null
          requires_supervisor_cosign?: boolean | null
          review_date?: string
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          supervisor_cosign_date?: string | null
          supervisor_cosigned?: boolean | null
          supervisor_id?: string | null
          supervisor_signature?: string | null
          support_systems?: string[] | null
          treatment_modalities?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_previous_version"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      waiting_room_queue: {
        Row: {
          admitted_at: string | null
          admitted_by: string | null
          created_at: string | null
          denial_reason: string | null
          denied_at: string | null
          denied_by: string | null
          id: string
          joined_at: string | null
          left_at: string | null
          session_id: string | null
          status: string
          user_email: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          admitted_at?: string | null
          admitted_by?: string | null
          created_at?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string | null
          status?: string
          user_email?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          admitted_at?: string | null
          admitted_by?: string | null
          created_at?: string | null
          denial_reason?: string | null
          denied_at?: string | null
          denied_by?: string | null
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string | null
          status?: string
          user_email?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "waiting_room_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
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
      find_matching_slots: {
        Args: { _waitlist_id: string }
        Returns: {
          appointment_date: string
          clinician_id: string
          end_time: string
          start_time: string
        }[]
      }
      generate_confirmation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_mrn: {
        Args: Record<PropertyKey, never>
        Returns: string
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
      is_session_host: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
      is_session_participant: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ai_generation_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "manual"
      app_role:
        | "administrator"
        | "supervisor"
        | "therapist"
        | "billing_staff"
        | "front_desk"
        | "associate_trainee"
      note_format: "SOAP" | "DAP" | "BIRP" | "GIRP" | "narrative" | "Narrative"
      note_type:
        | "intake_assessment"
        | "progress_note"
        | "psychotherapy_note"
        | "psychiatric_evaluation"
        | "crisis_assessment"
        | "discharge_summary"
        | "treatment_plan"
        | "supervision_note"
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
      ai_generation_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "manual",
      ],
      app_role: [
        "administrator",
        "supervisor",
        "therapist",
        "billing_staff",
        "front_desk",
        "associate_trainee",
      ],
      note_format: ["SOAP", "DAP", "BIRP", "GIRP", "narrative", "Narrative"],
      note_type: [
        "intake_assessment",
        "progress_note",
        "psychotherapy_note",
        "psychiatric_evaluation",
        "crisis_assessment",
        "discharge_summary",
        "treatment_plan",
        "supervision_note",
      ],
    },
  },
} as const
