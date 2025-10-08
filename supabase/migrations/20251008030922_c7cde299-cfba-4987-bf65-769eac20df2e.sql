-- Create notification_rules table
CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('Email', 'SMS', 'Dashboard Alert', 'All')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Trigger configuration
  trigger_event TEXT NOT NULL CHECK (trigger_event IN (
    'Note Due', 'Note Overdue', 'Note Locked', 'Supervisor Review Needed',
    'Appointment Reminder', 'Payment Due', 'License Expiring', 'Form Completed',
    'Message Received', 'Critical Assessment Score', 'Document Uploaded',
    'Client Registered', 'Insurance Expiring', 'Authorization Needed', 'Other'
  )),
  
  -- Conditions (JSON array of condition objects)
  conditions JSONB DEFAULT '[]'::jsonb,
  
  -- Recipients
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'Specific User', 'Client', 'Clinician', 'Supervisor', 'Administrator', 'Role'
  )),
  recipients TEXT[] NOT NULL, -- array of user IDs or role names
  
  -- Timing
  timing_type TEXT NOT NULL CHECK (timing_type IN (
    'Immediate', 'Scheduled', 'Before Event', 'After Event'
  )),
  timing_offset INTEGER, -- hours or days offset
  
  -- Message
  message_template TEXT NOT NULL,
  message_subject TEXT, -- for email/SMS
  
  -- Frequency
  send_once BOOLEAN NOT NULL DEFAULT true,
  send_repeatedly BOOLEAN NOT NULL DEFAULT false,
  repeat_interval INTEGER, -- days between repeats
  max_repeats INTEGER, -- maximum number of times to repeat
  
  -- Audit
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Last execution tracking
  last_executed_at TIMESTAMP WITH TIME ZONE,
  execution_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Administrators can manage notification rules"
ON public.notification_rules
FOR ALL
USING (has_role(auth.uid(), 'administrator'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can view active notification rules"
ON public.notification_rules
FOR SELECT
USING (is_active = true);

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.notification_rules(id) ON DELETE SET NULL,
  
  -- Recipient
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('User', 'Client')),
  recipient_email TEXT,
  recipient_phone TEXT,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('Email', 'SMS', 'Dashboard Alert')),
  message_content TEXT NOT NULL,
  message_subject TEXT,
  
  -- Delivery
  sent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_successfully BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  
  -- Engagement tracking
  opened BOOLEAN DEFAULT false,
  opened_date TIMESTAMP WITH TIME ZONE,
  clicked BOOLEAN DEFAULT false,
  clicked_date TIMESTAMP WITH TIME ZONE,
  
  -- Related entity
  related_entity_type TEXT, -- 'appointment', 'note', 'client', etc.
  related_entity_id UUID,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Administrators can view all notification logs"
ON public.notification_logs
FOR SELECT
USING (has_role(auth.uid(), 'administrator'::app_role));

CREATE POLICY "Users can view their own notification logs"
ON public.notification_logs
FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "System can insert notification logs"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_notification_rules_trigger ON public.notification_rules(trigger_event) WHERE is_active = true;
CREATE INDEX idx_notification_rules_active ON public.notification_rules(is_active);
CREATE INDEX idx_notification_logs_recipient ON public.notification_logs(recipient_id, sent_date DESC);
CREATE INDEX idx_notification_logs_rule ON public.notification_logs(rule_id, sent_date DESC);
CREATE INDEX idx_notification_logs_related ON public.notification_logs(related_entity_type, related_entity_id);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_notification_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER notification_rules_updated_at
BEFORE UPDATE ON public.notification_rules
FOR EACH ROW
EXECUTE FUNCTION update_notification_rules_updated_at();