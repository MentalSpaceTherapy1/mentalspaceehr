export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'signature' | 'file';
  required: boolean;
  order: number;
  options?: string[];
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minDate?: string;
    maxDate?: string;
    minAge?: number;
  };
}

export interface FormSection {
  id: string;
  title: string;
  order: number;
  description?: string;
  fields: FormField[];
}

export interface FormTemplate {
  id: string;
  form_type: 'Intake' | 'Consent' | 'Assessment' | 'Insurance Update' | 'Feedback' | 'Custom';
  title: string;
  description: string;
  version: number;
  sections: FormSection[];
  is_active: boolean;
  requires_signature: boolean;
  allow_partial_save: boolean;
  estimated_minutes?: number;
  created_at: string;
  updated_at: string;
}

export interface FormAssignment {
  id: string;
  template_id: string;
  client_id: string;
  assigned_by: string;
  assigned_date: string;
  due_date?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  instructions?: string;
  status: 'assigned' | 'started' | 'completed' | 'expired' | 'cancelled';
  status_updated_at: string;
  completed_at?: string;
  time_spent_seconds?: number;
  saved_to_chart: boolean;
  chart_note_id?: string;
  created_at: string;
  updated_at: string;
  template?: FormTemplate;
}

export interface FormResponse {
  id: string;
  assignment_id: string;
  client_id: string;
  responses: Record<string, any>;
  progress_percentage: number;
  started_at?: string;
  last_saved_at?: string;
  completed_at?: string;
  client_signature?: string;
  signature_date?: string;
  signature_ip?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  flagged_for_followup: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormWithResponse extends FormAssignment {
  response?: FormResponse;
}
