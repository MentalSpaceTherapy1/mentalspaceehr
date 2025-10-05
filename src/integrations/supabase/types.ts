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
          billed_under_provider_id: string | null
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
          is_incident_to: boolean
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
          billed_under_provider_id?: string | null
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
          is_incident_to?: boolean
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
          billed_under_provider_id?: string | null
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
          is_incident_to?: boolean
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
      cancellation_notes: {
        Row: {
          appointment_date: string
          appointment_id: string | null
          appointment_time: string
          cancellation_date: string
          cancellation_reason: string
          cancelled_by: string
          client_contacted: boolean | null
          client_id: string
          clinical_concerns: boolean | null
          clinician_id: string
          concern_details: string | null
          contact_date: string | null
          contact_method: string | null
          contact_outcome: string | null
          created_by: string | null
          created_date: string | null
          fee_amount: number | null
          fee_assessed: boolean | null
          fee_waived: boolean | null
          follow_up_needed: boolean | null
          follow_up_plan: string | null
          id: string
          new_appointment_date: string | null
          notice_given: string
          reason_details: string | null
          rescheduled: boolean | null
          signed_by: string | null
          signed_date: string | null
          status: string
          updated_at: string | null
          waiver_reason: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id?: string | null
          appointment_time: string
          cancellation_date: string
          cancellation_reason: string
          cancelled_by: string
          client_contacted?: boolean | null
          client_id: string
          clinical_concerns?: boolean | null
          clinician_id: string
          concern_details?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contact_outcome?: string | null
          created_by?: string | null
          created_date?: string | null
          fee_amount?: number | null
          fee_assessed?: boolean | null
          fee_waived?: boolean | null
          follow_up_needed?: boolean | null
          follow_up_plan?: string | null
          id?: string
          new_appointment_date?: string | null
          notice_given: string
          reason_details?: string | null
          rescheduled?: boolean | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          updated_at?: string | null
          waiver_reason?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: string | null
          appointment_time?: string
          cancellation_date?: string
          cancellation_reason?: string
          cancelled_by?: string
          client_contacted?: boolean | null
          client_id?: string
          clinical_concerns?: boolean | null
          clinician_id?: string
          concern_details?: string | null
          contact_date?: string | null
          contact_method?: string | null
          contact_outcome?: string | null
          created_by?: string | null
          created_date?: string | null
          fee_amount?: number | null
          fee_assessed?: boolean | null
          fee_waived?: boolean | null
          follow_up_needed?: boolean | null
          follow_up_plan?: string | null
          id?: string
          new_appointment_date?: string | null
          notice_given?: string
          reason_details?: string | null
          rescheduled?: boolean | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          updated_at?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      compliance_rules: {
        Row: {
          allow_exceptions: boolean | null
          automatic_locking: boolean
          created_at: string
          created_by: string | null
          days_allowed_for_documentation: number
          exception_roles: string[] | null
          grace_period_hours: number | null
          id: string
          is_active: boolean
          lockout_day: string
          lockout_time: string
          require_approval_to_unlock: boolean
          rule_id: string
          rule_name: string
          rule_type: string
          send_warning_notifications: boolean
          updated_at: string
          warning_days_before_due: number[] | null
        }
        Insert: {
          allow_exceptions?: boolean | null
          automatic_locking?: boolean
          created_at?: string
          created_by?: string | null
          days_allowed_for_documentation?: number
          exception_roles?: string[] | null
          grace_period_hours?: number | null
          id?: string
          is_active?: boolean
          lockout_day?: string
          lockout_time?: string
          require_approval_to_unlock?: boolean
          rule_id: string
          rule_name: string
          rule_type: string
          send_warning_notifications?: boolean
          updated_at?: string
          warning_days_before_due?: number[] | null
        }
        Update: {
          allow_exceptions?: boolean | null
          automatic_locking?: boolean
          created_at?: string
          created_by?: string | null
          days_allowed_for_documentation?: number
          exception_roles?: string[] | null
          grace_period_hours?: number | null
          id?: string
          is_active?: boolean
          lockout_day?: string
          lockout_time?: string
          require_approval_to_unlock?: boolean
          rule_id?: string
          rule_name?: string
          rule_type?: string
          send_warning_notifications?: boolean
          updated_at?: string
          warning_days_before_due?: number[] | null
        }
        Relationships: []
      }
      compliance_warnings: {
        Row: {
          compliance_status_id: string
          created_at: string
          delivered: boolean
          delivery_date: string | null
          error_message: string | null
          id: string
          warning_date: string
          warning_type: string
        }
        Insert: {
          compliance_status_id: string
          created_at?: string
          delivered?: boolean
          delivery_date?: string | null
          error_message?: string | null
          id?: string
          warning_date?: string
          warning_type: string
        }
        Update: {
          compliance_status_id?: string
          created_at?: string
          delivered?: boolean
          delivery_date?: string | null
          error_message?: string | null
          id?: string
          warning_date?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_warnings_compliance_status_id_fkey"
            columns: ["compliance_status_id"]
            isOneToOne: false
            referencedRelation: "note_compliance_status"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_notes: {
        Row: {
          billable: boolean | null
          billing_code: string | null
          changes_to_treatment: boolean | null
          client_consent: boolean | null
          client_id: string
          clinical_question: string
          clinician_id: string
          consultation_date: string
          consultation_reason: string
          consultation_type: string
          consulting_with: Json
          created_by: string | null
          created_date: string | null
          follow_up_consultation: boolean | null
          follow_up_plan: string | null
          id: string
          information_provided: string | null
          information_received: string | null
          recommendations: string | null
          signed_by: string | null
          signed_date: string | null
          status: string
          treatment_changes: string | null
          updated_at: string | null
        }
        Insert: {
          billable?: boolean | null
          billing_code?: string | null
          changes_to_treatment?: boolean | null
          client_consent?: boolean | null
          client_id: string
          clinical_question: string
          clinician_id: string
          consultation_date: string
          consultation_reason: string
          consultation_type: string
          consulting_with: Json
          created_by?: string | null
          created_date?: string | null
          follow_up_consultation?: boolean | null
          follow_up_plan?: string | null
          id?: string
          information_provided?: string | null
          information_received?: string | null
          recommendations?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          treatment_changes?: string | null
          updated_at?: string | null
        }
        Update: {
          billable?: boolean | null
          billing_code?: string | null
          changes_to_treatment?: boolean | null
          client_consent?: boolean | null
          client_id?: string
          clinical_question?: string
          clinician_id?: string
          consultation_date?: string
          consultation_reason?: string
          consultation_type?: string
          consulting_with?: Json
          created_by?: string | null
          created_date?: string | null
          follow_up_consultation?: boolean | null
          follow_up_plan?: string | null
          id?: string
          information_provided?: string | null
          information_received?: string | null
          recommendations?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          treatment_changes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          billable: boolean | null
          billing_code: string | null
          client_id: string
          clinical_significance: boolean | null
          clinician_id: string
          collateral_contact: Json | null
          contact_date: string
          contact_details: string
          contact_duration: number | null
          contact_initiated_by: string
          contact_purpose: string
          contact_time: string
          contact_type: string
          created_by: string | null
          created_date: string | null
          follow_up_date: string | null
          follow_up_needed: boolean | null
          follow_up_plan: string | null
          id: string
          intervention_provided: string | null
          location: string | null
          outcome: string | null
          participants: Json | null
          related_documentation: string | null
          risk_details: string | null
          risk_issues: boolean | null
          signed_by: string | null
          signed_date: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          billable?: boolean | null
          billing_code?: string | null
          client_id: string
          clinical_significance?: boolean | null
          clinician_id: string
          collateral_contact?: Json | null
          contact_date: string
          contact_details: string
          contact_duration?: number | null
          contact_initiated_by: string
          contact_purpose: string
          contact_time: string
          contact_type: string
          created_by?: string | null
          created_date?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          follow_up_plan?: string | null
          id?: string
          intervention_provided?: string | null
          location?: string | null
          outcome?: string | null
          participants?: Json | null
          related_documentation?: string | null
          risk_details?: string | null
          risk_issues?: boolean | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          billable?: boolean | null
          billing_code?: string | null
          client_id?: string
          clinical_significance?: boolean | null
          clinician_id?: string
          collateral_contact?: Json | null
          contact_date?: string
          contact_details?: string
          contact_duration?: number | null
          contact_initiated_by?: string
          contact_purpose?: string
          contact_time?: string
          contact_type?: string
          created_by?: string | null
          created_date?: string | null
          follow_up_date?: string | null
          follow_up_needed?: boolean | null
          follow_up_plan?: string | null
          id?: string
          intervention_provided?: string | null
          location?: string | null
          outcome?: string | null
          participants?: Json | null
          related_documentation?: string | null
          risk_details?: string | null
          risk_issues?: boolean | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      incident_to_audit_log: {
        Row: {
          action_timestamp: string
          action_type: string
          appointment_id: string | null
          change_reason: string | null
          compliance_issues: Json | null
          compliance_status: string | null
          created_at: string
          id: string
          incident_to_billing_id: string | null
          ip_address: string | null
          new_values: Json | null
          note_id: string | null
          notes: string | null
          performed_by: string
          previous_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action_timestamp?: string
          action_type: string
          appointment_id?: string | null
          change_reason?: string | null
          compliance_issues?: Json | null
          compliance_status?: string | null
          created_at?: string
          id?: string
          incident_to_billing_id?: string | null
          ip_address?: string | null
          new_values?: Json | null
          note_id?: string | null
          notes?: string | null
          performed_by: string
          previous_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action_timestamp?: string
          action_type?: string
          appointment_id?: string | null
          change_reason?: string | null
          compliance_issues?: Json | null
          compliance_status?: string | null
          created_at?: string
          id?: string
          incident_to_billing_id?: string | null
          ip_address?: string | null
          new_values?: Json | null
          note_id?: string | null
          notes?: string | null
          performed_by?: string
          previous_values?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_to_audit_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_to_audit_log_incident_to_billing_id_fkey"
            columns: ["incident_to_billing_id"]
            isOneToOne: false
            referencedRelation: "incident_to_billing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_to_audit_log_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_to_billing: {
        Row: {
          billed_under_provider_id: string
          billing_compliant: boolean
          client_id: string
          compliance_check_date: string | null
          created_at: string
          created_by: string | null
          documentation_complete: boolean
          id: string
          note_id: string
          notes: string | null
          provider_attestation: Json
          rendering_provider_id: string
          requirements_met: Json
          session_id: string | null
          supervising_provider_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          billed_under_provider_id: string
          billing_compliant?: boolean
          client_id: string
          compliance_check_date?: string | null
          created_at?: string
          created_by?: string | null
          documentation_complete?: boolean
          id?: string
          note_id: string
          notes?: string | null
          provider_attestation?: Json
          rendering_provider_id: string
          requirements_met?: Json
          session_id?: string | null
          supervising_provider_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          billed_under_provider_id?: string
          billing_compliant?: boolean
          client_id?: string
          compliance_check_date?: string | null
          created_at?: string
          created_by?: string | null
          documentation_complete?: boolean
          id?: string
          note_id?: string
          notes?: string | null
          provider_attestation?: Json
          rendering_provider_id?: string
          requirements_met?: Json
          session_id?: string | null
          supervising_provider_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_to_billing_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_to_billing_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_to_billing_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
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
      miscellaneous_notes: {
        Row: {
          billable: boolean | null
          billing_code: string | null
          client_id: string
          clinically_relevant: boolean | null
          clinician_id: string
          contact_method: string | null
          created_by: string | null
          created_date: string | null
          duration: number | null
          follow_up_date: string | null
          follow_up_plan: string | null
          follow_up_required: boolean | null
          id: string
          location: string | null
          note_content: string
          note_date: string
          note_type: string
          outcome: string | null
          participants: Json | null
          purpose: string | null
          related_documentation: string | null
          signed_by: string | null
          signed_date: string | null
          status: string
          subject: string
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          billable?: boolean | null
          billing_code?: string | null
          client_id: string
          clinically_relevant?: boolean | null
          clinician_id: string
          contact_method?: string | null
          created_by?: string | null
          created_date?: string | null
          duration?: number | null
          follow_up_date?: string | null
          follow_up_plan?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          note_content: string
          note_date: string
          note_type: string
          outcome?: string | null
          participants?: Json | null
          purpose?: string | null
          related_documentation?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          subject: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          billable?: boolean | null
          billing_code?: string | null
          client_id?: string
          clinically_relevant?: boolean | null
          clinician_id?: string
          contact_method?: string | null
          created_by?: string | null
          created_date?: string | null
          duration?: number | null
          follow_up_date?: string | null
          follow_up_plan?: string | null
          follow_up_required?: boolean | null
          id?: string
          location?: string | null
          note_content?: string
          note_date?: string
          note_type?: string
          outcome?: string | null
          participants?: Json | null
          purpose?: string | null
          related_documentation?: string | null
          signed_by?: string | null
          signed_date?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "miscellaneous_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      note_compliance_status: {
        Row: {
          client_id: string
          clinician_id: string
          created_at: string
          days_overdue: number | null
          days_until_due: number | null
          due_date: string
          id: string
          is_locked: boolean
          lock_reason: string | null
          locked_date: string | null
          note_id: string
          note_type: string
          session_date: string
          status: string
          unlock_approved: boolean | null
          unlock_approved_date: string | null
          unlock_approver_id: string | null
          unlock_denied_reason: string | null
          unlock_expires_at: string | null
          unlock_request_date: string | null
          unlock_request_reason: string | null
          unlock_requested: boolean
          unlock_requester_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          clinician_id: string
          created_at?: string
          days_overdue?: number | null
          days_until_due?: number | null
          due_date: string
          id?: string
          is_locked?: boolean
          lock_reason?: string | null
          locked_date?: string | null
          note_id: string
          note_type: string
          session_date: string
          status?: string
          unlock_approved?: boolean | null
          unlock_approved_date?: string | null
          unlock_approver_id?: string | null
          unlock_denied_reason?: string | null
          unlock_expires_at?: string | null
          unlock_request_date?: string | null
          unlock_request_reason?: string | null
          unlock_requested?: boolean
          unlock_requester_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          clinician_id?: string
          created_at?: string
          days_overdue?: number | null
          days_until_due?: number | null
          due_date?: string
          id?: string
          is_locked?: boolean
          lock_reason?: string | null
          locked_date?: string | null
          note_id?: string
          note_type?: string
          session_date?: string
          status?: string
          unlock_approved?: boolean | null
          unlock_approved_date?: string | null
          unlock_approver_id?: string | null
          unlock_denied_reason?: string | null
          unlock_expires_at?: string | null
          unlock_request_date?: string | null
          unlock_request_reason?: string | null
          unlock_requested?: boolean
          unlock_requester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_compliance_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      note_cosignatures: {
        Row: {
          clinician_id: string
          clinician_signed: boolean | null
          clinician_signed_date: string | null
          created_date: string | null
          due_date: string | null
          escalated: boolean | null
          escalated_date: string | null
          id: string
          is_incident_to: boolean | null
          note_id: string
          note_type: string
          notification_log: Json | null
          relationship_id: string | null
          reviewed_date: string | null
          revision_details: string | null
          revision_history: Json | null
          revisions_requested: boolean | null
          status: string
          submitted_for_cosign_date: string | null
          supervisor_attestation: string | null
          supervisor_comments: string | null
          supervisor_cosigned: boolean | null
          supervisor_cosigned_date: string | null
          supervisor_id: string
          supervisor_notified: boolean | null
          supervisor_notified_date: string | null
          time_spent_reviewing: number | null
          updated_at: string | null
        }
        Insert: {
          clinician_id: string
          clinician_signed?: boolean | null
          clinician_signed_date?: string | null
          created_date?: string | null
          due_date?: string | null
          escalated?: boolean | null
          escalated_date?: string | null
          id?: string
          is_incident_to?: boolean | null
          note_id: string
          note_type: string
          notification_log?: Json | null
          relationship_id?: string | null
          reviewed_date?: string | null
          revision_details?: string | null
          revision_history?: Json | null
          revisions_requested?: boolean | null
          status?: string
          submitted_for_cosign_date?: string | null
          supervisor_attestation?: string | null
          supervisor_comments?: string | null
          supervisor_cosigned?: boolean | null
          supervisor_cosigned_date?: string | null
          supervisor_id: string
          supervisor_notified?: boolean | null
          supervisor_notified_date?: string | null
          time_spent_reviewing?: number | null
          updated_at?: string | null
        }
        Update: {
          clinician_id?: string
          clinician_signed?: boolean | null
          clinician_signed_date?: string | null
          created_date?: string | null
          due_date?: string | null
          escalated?: boolean | null
          escalated_date?: string | null
          id?: string
          is_incident_to?: boolean | null
          note_id?: string
          note_type?: string
          notification_log?: Json | null
          relationship_id?: string | null
          reviewed_date?: string | null
          revision_details?: string | null
          revision_history?: Json | null
          revisions_requested?: boolean | null
          status?: string
          submitted_for_cosign_date?: string | null
          supervisor_attestation?: string | null
          supervisor_comments?: string | null
          supervisor_cosigned?: boolean | null
          supervisor_cosigned_date?: string | null
          supervisor_id?: string
          supervisor_notified?: boolean | null
          supervisor_notified_date?: string | null
          time_spent_reviewing?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_cosignatures_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "supervision_hours_summary"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "note_cosignatures_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "supervision_relationships"
            referencedColumns: ["id"]
          },
        ]
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
          licensed_states: string[] | null
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
          licensed_states?: string[] | null
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
          licensed_states?: string[] | null
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
      session_bandwidth_tests: {
        Row: {
          created_at: string | null
          download_mbps: number | null
          id: string
          quality_rating: string | null
          recommended_video_quality: string | null
          session_id: string | null
          test_duration_ms: number | null
          test_timestamp: string | null
          upload_mbps: number | null
          user_id: string | null
          user_proceeded: boolean | null
          user_selected_quality: string | null
        }
        Insert: {
          created_at?: string | null
          download_mbps?: number | null
          id?: string
          quality_rating?: string | null
          recommended_video_quality?: string | null
          session_id?: string | null
          test_duration_ms?: number | null
          test_timestamp?: string | null
          upload_mbps?: number | null
          user_id?: string | null
          user_proceeded?: boolean | null
          user_selected_quality?: string | null
        }
        Update: {
          created_at?: string | null
          download_mbps?: number | null
          id?: string
          quality_rating?: string | null
          recommended_video_quality?: string | null
          session_id?: string | null
          test_duration_ms?: number | null
          test_timestamp?: string | null
          upload_mbps?: number | null
          user_id?: string | null
          user_proceeded?: boolean | null
          user_selected_quality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_bandwidth_tests_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_connection_metrics: {
        Row: {
          bandwidth_kbps: number | null
          connection_state: string | null
          created_at: string | null
          id: string
          jitter_ms: number | null
          latency_ms: number | null
          packet_loss_percent: number | null
          participant_id: string | null
          recorded_at: string | null
          session_id: string | null
        }
        Insert: {
          bandwidth_kbps?: number | null
          connection_state?: string | null
          created_at?: string | null
          id?: string
          jitter_ms?: number | null
          latency_ms?: number | null
          packet_loss_percent?: number | null
          participant_id?: string | null
          recorded_at?: string | null
          session_id?: string | null
        }
        Update: {
          bandwidth_kbps?: number | null
          connection_state?: string | null
          created_at?: string | null
          id?: string
          jitter_ms?: number | null
          latency_ms?: number | null
          packet_loss_percent?: number | null
          participant_id?: string | null
          recorded_at?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_connection_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "telehealth_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          can_bill_incident_to: boolean
          competencies_achieved: Json | null
          competencies_to_achieve: string[] | null
          created_by: string | null
          created_date: string | null
          end_date: string | null
          id: string
          incident_to_requirements_verified: Json | null
          incident_to_start_date: string | null
          notification_settings: Json | null
          relationship_type: string
          required_direct_hours: number | null
          required_group_hours: number | null
          required_indirect_hours: number | null
          required_supervision_hours: number
          requires_note_cosign: boolean
          scheduled_day_time: string | null
          start_date: string
          status: string
          supervisee_id: string
          supervision_frequency: string | null
          supervisor_id: string
          updated_at: string | null
        }
        Insert: {
          can_bill_incident_to?: boolean
          competencies_achieved?: Json | null
          competencies_to_achieve?: string[] | null
          created_by?: string | null
          created_date?: string | null
          end_date?: string | null
          id?: string
          incident_to_requirements_verified?: Json | null
          incident_to_start_date?: string | null
          notification_settings?: Json | null
          relationship_type?: string
          required_direct_hours?: number | null
          required_group_hours?: number | null
          required_indirect_hours?: number | null
          required_supervision_hours?: number
          requires_note_cosign?: boolean
          scheduled_day_time?: string | null
          start_date?: string
          status?: string
          supervisee_id: string
          supervision_frequency?: string | null
          supervisor_id: string
          updated_at?: string | null
        }
        Update: {
          can_bill_incident_to?: boolean
          competencies_achieved?: Json | null
          competencies_to_achieve?: string[] | null
          created_by?: string | null
          created_date?: string | null
          end_date?: string | null
          id?: string
          incident_to_requirements_verified?: Json | null
          incident_to_start_date?: string | null
          notification_settings?: Json | null
          relationship_type?: string
          required_direct_hours?: number | null
          required_group_hours?: number | null
          required_indirect_hours?: number | null
          required_supervision_hours?: number
          requires_note_cosign?: boolean
          scheduled_day_time?: string | null
          start_date?: string
          status?: string
          supervisee_id?: string
          supervision_frequency?: string | null
          supervisor_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      supervision_session_attachments: {
        Row: {
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          session_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          session_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          session_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supervision_session_attachments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "supervision_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_sessions: {
        Row: {
          action_items: Json | null
          applies_to: string | null
          areas_for_improvement: string[] | null
          areas_of_strength: string[] | null
          cases_discussed: Json | null
          cases_reviewed: string[] | null
          competencies_addressed: string[] | null
          created_by: string | null
          created_date: string | null
          dispute_reason: string | null
          feedback_provided: string | null
          group_supervisees: Json | null
          id: string
          next_session_date: string | null
          next_session_scheduled: boolean | null
          notes: string | null
          notes_reviewed: string[] | null
          relationship_id: string
          session_date: string
          session_duration_minutes: number
          session_end_time: string | null
          session_format: string | null
          session_start_time: string | null
          session_type: string
          skills_developed: string[] | null
          status: string
          supervisee_reflection: string | null
          supervisee_signature_name: string | null
          supervisee_signed: boolean | null
          supervisee_signed_date: string | null
          supervisor_signature_name: string | null
          supervisor_signed: boolean | null
          supervisor_signed_date: string | null
          topics_discussed: string[] | null
          updated_at: string | null
          verification_date: string | null
          verified_by_supervisor: boolean | null
        }
        Insert: {
          action_items?: Json | null
          applies_to?: string | null
          areas_for_improvement?: string[] | null
          areas_of_strength?: string[] | null
          cases_discussed?: Json | null
          cases_reviewed?: string[] | null
          competencies_addressed?: string[] | null
          created_by?: string | null
          created_date?: string | null
          dispute_reason?: string | null
          feedback_provided?: string | null
          group_supervisees?: Json | null
          id?: string
          next_session_date?: string | null
          next_session_scheduled?: boolean | null
          notes?: string | null
          notes_reviewed?: string[] | null
          relationship_id: string
          session_date: string
          session_duration_minutes: number
          session_end_time?: string | null
          session_format?: string | null
          session_start_time?: string | null
          session_type: string
          skills_developed?: string[] | null
          status?: string
          supervisee_reflection?: string | null
          supervisee_signature_name?: string | null
          supervisee_signed?: boolean | null
          supervisee_signed_date?: string | null
          supervisor_signature_name?: string | null
          supervisor_signed?: boolean | null
          supervisor_signed_date?: string | null
          topics_discussed?: string[] | null
          updated_at?: string | null
          verification_date?: string | null
          verified_by_supervisor?: boolean | null
        }
        Update: {
          action_items?: Json | null
          applies_to?: string | null
          areas_for_improvement?: string[] | null
          areas_of_strength?: string[] | null
          cases_discussed?: Json | null
          cases_reviewed?: string[] | null
          competencies_addressed?: string[] | null
          created_by?: string | null
          created_date?: string | null
          dispute_reason?: string | null
          feedback_provided?: string | null
          group_supervisees?: Json | null
          id?: string
          next_session_date?: string | null
          next_session_scheduled?: boolean | null
          notes?: string | null
          notes_reviewed?: string[] | null
          relationship_id?: string
          session_date?: string
          session_duration_minutes?: number
          session_end_time?: string | null
          session_format?: string | null
          session_start_time?: string | null
          session_type?: string
          skills_developed?: string[] | null
          status?: string
          supervisee_reflection?: string | null
          supervisee_signature_name?: string | null
          supervisee_signed?: boolean | null
          supervisee_signed_date?: string | null
          supervisor_signature_name?: string | null
          supervisor_signed?: boolean | null
          supervisor_signed_date?: string | null
          topics_discussed?: string[] | null
          updated_at?: string | null
          verification_date?: string | null
          verified_by_supervisor?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "supervision_sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "supervision_hours_summary"
            referencedColumns: ["relationship_id"]
          },
          {
            foreignKeyName: "supervision_sessions_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "supervision_relationships"
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
      telehealth_consents: {
        Row: {
          adequate_connection_confirmed: boolean | null
          can_revoke_consent: boolean | null
          client_id: string
          client_signature: string | null
          client_state_of_residence: string | null
          clinician_id: string | null
          clinician_licensed_in_state: boolean | null
          confidentiality_limits_understood: boolean | null
          consent_date: string | null
          consent_given: boolean | null
          consent_revoked: boolean | null
          consents_to_recording: boolean | null
          created_at: string | null
          current_physical_location: string | null
          emergency_contact: Json | null
          emergency_contact_provided: boolean | null
          emergency_protocol_understood: boolean | null
          expiration_date: string | null
          id: string
          local_emergency_number: string | null
          privacy_policy_reviewed: boolean | null
          private_location_confirmed: boolean | null
          renewal_notification_date: string | null
          renewal_notified: boolean | null
          revocation_date: string | null
          revocation_reason: string | null
          risks_acknowledged: Json | null
          secure_platform_understood: boolean | null
          technical_requirements_understood: boolean | null
          understands_recording_policy: boolean | null
          understood_alternatives: boolean | null
          understood_benefits: boolean | null
          understood_limitations: boolean | null
          understood_risks: boolean | null
          updated_at: string | null
        }
        Insert: {
          adequate_connection_confirmed?: boolean | null
          can_revoke_consent?: boolean | null
          client_id: string
          client_signature?: string | null
          client_state_of_residence?: string | null
          clinician_id?: string | null
          clinician_licensed_in_state?: boolean | null
          confidentiality_limits_understood?: boolean | null
          consent_date?: string | null
          consent_given?: boolean | null
          consent_revoked?: boolean | null
          consents_to_recording?: boolean | null
          created_at?: string | null
          current_physical_location?: string | null
          emergency_contact?: Json | null
          emergency_contact_provided?: boolean | null
          emergency_protocol_understood?: boolean | null
          expiration_date?: string | null
          id?: string
          local_emergency_number?: string | null
          privacy_policy_reviewed?: boolean | null
          private_location_confirmed?: boolean | null
          renewal_notification_date?: string | null
          renewal_notified?: boolean | null
          revocation_date?: string | null
          revocation_reason?: string | null
          risks_acknowledged?: Json | null
          secure_platform_understood?: boolean | null
          technical_requirements_understood?: boolean | null
          understands_recording_policy?: boolean | null
          understood_alternatives?: boolean | null
          understood_benefits?: boolean | null
          understood_limitations?: boolean | null
          understood_risks?: boolean | null
          updated_at?: string | null
        }
        Update: {
          adequate_connection_confirmed?: boolean | null
          can_revoke_consent?: boolean | null
          client_id?: string
          client_signature?: string | null
          client_state_of_residence?: string | null
          clinician_id?: string | null
          clinician_licensed_in_state?: boolean | null
          confidentiality_limits_understood?: boolean | null
          consent_date?: string | null
          consent_given?: boolean | null
          consent_revoked?: boolean | null
          consents_to_recording?: boolean | null
          created_at?: string | null
          current_physical_location?: string | null
          emergency_contact?: Json | null
          emergency_contact_provided?: boolean | null
          emergency_protocol_understood?: boolean | null
          expiration_date?: string | null
          id?: string
          local_emergency_number?: string | null
          privacy_policy_reviewed?: boolean | null
          private_location_confirmed?: boolean | null
          renewal_notification_date?: string | null
          renewal_notified?: boolean | null
          revocation_date?: string | null
          revocation_reason?: string | null
          risks_acknowledged?: Json | null
          secure_platform_understood?: boolean | null
          technical_requirements_understood?: boolean | null
          understands_recording_policy?: boolean | null
          understood_alternatives?: boolean | null
          understood_benefits?: boolean | null
          understood_limitations?: boolean | null
          understood_risks?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telehealth_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telehealth_consents_clinician_id_fkey"
            columns: ["clinician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          consent_id: string | null
          consent_verification_date: string | null
          consent_verified: boolean | null
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
          session_timeout_minutes: number | null
          started_at: string | null
          status: string
          timeout_warning_shown: boolean | null
          transcript_enabled: boolean | null
          updated_at: string | null
          waiting_room_enabled: boolean | null
        }
        Insert: {
          appointment_id?: string | null
          consent_id?: string | null
          consent_verification_date?: string | null
          consent_verified?: boolean | null
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
          session_timeout_minutes?: number | null
          started_at?: string | null
          status?: string
          timeout_warning_shown?: boolean | null
          transcript_enabled?: boolean | null
          updated_at?: string | null
          waiting_room_enabled?: boolean | null
        }
        Update: {
          appointment_id?: string | null
          consent_id?: string | null
          consent_verification_date?: string | null
          consent_verified?: boolean | null
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
          session_timeout_minutes?: number | null
          started_at?: string | null
          status?: string
          timeout_warning_shown?: boolean | null
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
          {
            foreignKeyName: "telehealth_sessions_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "telehealth_consents"
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
          supervisor_comments: string | null
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
          supervisor_comments?: string | null
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
          supervisor_comments?: string | null
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
      unlock_requests: {
        Row: {
          compliance_status_id: string
          created_at: string
          expires_at: string | null
          id: string
          note_id: string
          note_type: string
          request_date: string
          request_reason: string
          requester_id: string
          review_notes: string | null
          reviewed_date: string | null
          reviewer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          compliance_status_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          note_id: string
          note_type: string
          request_date?: string
          request_reason: string
          requester_id: string
          review_notes?: string | null
          reviewed_date?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          compliance_status_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          note_id?: string
          note_type?: string
          request_date?: string
          request_reason?: string
          requester_id?: string
          review_notes?: string | null
          reviewed_date?: string | null
          reviewer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unlock_requests_compliance_status_id_fkey"
            columns: ["compliance_status_id"]
            isOneToOne: false
            referencedRelation: "note_compliance_status"
            referencedColumns: ["id"]
          },
        ]
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
      supervision_hours_summary: {
        Row: {
          completed_hours: number | null
          direct_hours_completed: number | null
          group_hours_completed: number | null
          indirect_hours_completed: number | null
          relationship_id: string | null
          remaining_hours: number | null
          required_direct_hours: number | null
          required_group_hours: number | null
          required_indirect_hours: number | null
          required_supervision_hours: number | null
          supervisee_id: string | null
          supervisor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_compliance_status: {
        Args: { p_days_allowed?: number; p_session_date: string }
        Returns: {
          days_overdue: number
          days_until_due: number
          due_date: string
          status: string
        }[]
      }
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
      validate_telehealth_licensure: {
        Args: { _client_id: string; _clinician_id: string }
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
