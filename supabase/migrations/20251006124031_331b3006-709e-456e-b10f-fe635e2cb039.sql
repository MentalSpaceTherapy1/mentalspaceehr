-- Create client_statements table
CREATE TABLE public.client_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core info
  statement_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  statement_date DATE NOT NULL,
  statement_period_start DATE NOT NULL,
  statement_period_end DATE NOT NULL,
  
  -- Balances
  previous_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
  payments NUMERIC(10,2) NOT NULL DEFAULT 0,
  adjustments NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Aging buckets
  current_aging NUMERIC(10,2) NOT NULL DEFAULT 0, -- 0-30 days
  aging_30 NUMERIC(10,2) NOT NULL DEFAULT 0, -- 31-60 days
  aging_60 NUMERIC(10,2) NOT NULL DEFAULT 0, -- 61-90 days
  aging_90 NUMERIC(10,2) NOT NULL DEFAULT 0, -- 91-120 days
  aging_120 NUMERIC(10,2) NOT NULL DEFAULT 0, -- 120+ days
  
  -- Detail (stored as JSONB)
  charges JSONB NOT NULL DEFAULT '[]'::jsonb,
  payments_received JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Message
  statement_message TEXT,
  due_date DATE,
  
  -- Status
  statement_status TEXT NOT NULL DEFAULT 'Generated' CHECK (statement_status IN ('Generated', 'Sent', 'Viewed', 'Paid')),
  sent_date DATE,
  sent_method TEXT NOT NULL DEFAULT 'Not Sent' CHECK (sent_method IN ('Mail', 'Email', 'Portal', 'Not Sent')),
  
  -- Portal tracking
  viewed_in_portal BOOLEAN DEFAULT false,
  viewed_date TIMESTAMP WITH TIME ZONE,
  
  -- Collections
  in_collections BOOLEAN DEFAULT false,
  collection_date DATE,
  collection_agency TEXT,
  
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_client_statements_client_id ON public.client_statements(client_id);
CREATE INDEX idx_client_statements_statement_date ON public.client_statements(statement_date);
CREATE INDEX idx_client_statements_status ON public.client_statements(statement_status);
CREATE INDEX idx_client_statements_in_collections ON public.client_statements(in_collections);

-- Enable RLS
ALTER TABLE public.client_statements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Billing staff can manage statements"
ON public.client_statements
FOR ALL
USING (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
);

CREATE POLICY "Clinicians can view statements for their clients"
ON public.client_statements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_statements.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid()
    )
  )
);

CREATE POLICY "Clients can view their own statements"
ON public.client_statements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_statements.client_id
    AND clients.portal_user_id = auth.uid()
  )
);

-- Function to generate statement ID
CREATE OR REPLACE FUNCTION public.generate_statement_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(statement_id FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM client_statements
  WHERE statement_id LIKE 'STMT-%';
  
  RETURN 'STMT-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;