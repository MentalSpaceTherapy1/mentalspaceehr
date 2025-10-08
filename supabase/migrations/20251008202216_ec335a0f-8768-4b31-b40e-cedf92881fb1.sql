-- Create portal_form_notifications table to track email notifications
CREATE TABLE public.portal_form_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.portal_form_assignments(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  resend_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.portal_form_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view notification logs
CREATE POLICY "Staff can view notification logs"
  ON public.portal_form_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_form_assignments pfa
      WHERE pfa.id = portal_form_notifications.assignment_id
      AND (
        pfa.assigned_by = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  );

-- Policy: System can insert notification logs
CREATE POLICY "System can insert notification logs"
  ON public.portal_form_notifications
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_portal_form_notifications_assignment_id 
  ON public.portal_form_notifications(assignment_id);

CREATE INDEX idx_portal_form_notifications_status 
  ON public.portal_form_notifications(status);