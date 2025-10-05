-- Create portal_invoices table
CREATE TABLE public.portal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) DEFAULT 0,
  balance_due NUMERIC(10,2) NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Partial', 'Overdue', 'Cancelled')),
  
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  notes TEXT,
  
  generated_by UUID REFERENCES auth.users(id),
  generated_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create portal_payments table
CREATE TABLE public.portal_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  payment_date DATE NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Credit Card', 'Debit Card', 'ACH', 'Other')),
  
  -- Card Details (tokenized, PCI compliant)
  card_token TEXT,
  card_last4 TEXT,
  card_brand TEXT CHECK (card_brand IN ('Visa', 'Mastercard', 'Amex', 'Discover', NULL)),
  
  -- Transaction
  transaction_id TEXT,
  transaction_status TEXT NOT NULL DEFAULT 'Pending' CHECK (transaction_status IN ('Pending', 'Approved', 'Declined', 'Refunded')),
  decline_reason TEXT,
  
  -- Applied To
  applied_to_invoices JSONB DEFAULT '[]'::jsonb,
  
  -- Receipt
  receipt_generated BOOLEAN DEFAULT false,
  receipt_url TEXT,
  
  -- Refunds
  refunded BOOLEAN DEFAULT false,
  refund_amount NUMERIC(10,2),
  refund_date DATE,
  refund_reason TEXT,
  
  -- Metadata
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  created_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_portal_invoices_client_id ON public.portal_invoices(client_id);
CREATE INDEX idx_portal_invoices_status ON public.portal_invoices(status);
CREATE INDEX idx_portal_invoices_due_date ON public.portal_invoices(due_date);
CREATE INDEX idx_portal_payments_client_id ON public.portal_payments(client_id);
CREATE INDEX idx_portal_payments_transaction_status ON public.portal_payments(transaction_status);

-- Enable RLS
ALTER TABLE public.portal_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portal_invoices
CREATE POLICY "Clients can view their own invoices"
  ON public.portal_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.portal_user_id = auth.uid()
      AND clients.id = portal_invoices.client_id
    )
  );

CREATE POLICY "Staff can view client invoices"
  ON public.portal_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_invoices.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'billing_staff'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  );

CREATE POLICY "Billing staff can manage invoices"
  ON public.portal_invoices
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- RLS Policies for portal_payments
CREATE POLICY "Clients can view their own payments"
  ON public.portal_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.portal_user_id = auth.uid()
      AND clients.id = portal_payments.client_id
    )
  );

CREATE POLICY "Staff can view client payments"
  ON public.portal_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = portal_payments.client_id
      AND (
        clients.primary_therapist_id = auth.uid()
        OR has_role(auth.uid(), 'administrator'::app_role)
        OR has_role(auth.uid(), 'billing_staff'::app_role)
        OR has_role(auth.uid(), 'front_desk'::app_role)
      )
    )
  );

CREATE POLICY "Billing staff can manage payments"
  ON public.portal_payments
  FOR ALL
  USING (
    has_role(auth.uid(), 'administrator'::app_role)
    OR has_role(auth.uid(), 'billing_staff'::app_role)
  );

-- Add updated_at triggers
CREATE TRIGGER update_portal_invoices_updated_at
  BEFORE UPDATE ON public.portal_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portal_payments_updated_at
  BEFORE UPDATE ON public.portal_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();