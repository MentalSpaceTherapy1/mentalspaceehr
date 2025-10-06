-- Drop existing insurance_payments table and recreate with new structure
DROP TABLE IF EXISTS public.insurance_payments CASCADE;

-- Create payment_records table with comprehensive structure
CREATE TABLE public.payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core payment info
  payment_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  payment_date DATE NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  
  -- Payment source and method
  payment_source TEXT NOT NULL CHECK (payment_source IN ('Insurance', 'Client', 'Guarantor', 'Third Party')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Check', 'Credit Card', 'Debit Card', 'Cash', 'ACH', 'EFT', 'Portal Payment')),
  
  -- Payment details
  check_number TEXT,
  card_last_4 TEXT,
  transaction_id TEXT,
  
  -- Insurance EOB
  eob_date DATE,
  eob_attachment TEXT,
  claim_number TEXT,
  
  -- Applied payments (stored as JSONB array)
  applied_payments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Adjustments (stored as JSONB array)
  adjustments JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Overpayment tracking
  overpayment_amount NUMERIC(10,2) DEFAULT 0,
  refund_issued BOOLEAN DEFAULT false,
  refund_date DATE,
  refund_amount NUMERIC(10,2),
  
  -- Unapplied amount
  unapplied_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Deposit info
  deposit_id TEXT,
  deposit_date DATE,
  
  -- Status
  payment_status TEXT NOT NULL DEFAULT 'Posted' CHECK (payment_status IN ('Posted', 'Pending', 'Reversed', 'Refunded')),
  
  -- Audit fields
  posted_by UUID REFERENCES public.profiles(id),
  posted_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  notes TEXT,
  
  created_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payment_records_client_id ON public.payment_records(client_id);
CREATE INDEX idx_payment_records_payment_date ON public.payment_records(payment_date);
CREATE INDEX idx_payment_records_payment_status ON public.payment_records(payment_status);
CREATE INDEX idx_payment_records_deposit_id ON public.payment_records(deposit_id);

-- Enable RLS
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Billing staff can manage payment records"
ON public.payment_records
FOR ALL
USING (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
)
WITH CHECK (
  has_role(auth.uid(), 'administrator') OR 
  has_role(auth.uid(), 'billing_staff')
);

CREATE POLICY "Clinicians can view payment records for their clients"
ON public.payment_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = payment_records.client_id
    AND (
      clients.primary_therapist_id = auth.uid() OR
      clients.psychiatrist_id = auth.uid()
    )
  )
);

-- Update generate_payment_id function to use new table
CREATE OR REPLACE FUNCTION public.generate_payment_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM payment_records
  WHERE payment_id LIKE 'PAY-%';
  
  RETURN 'PAY-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;