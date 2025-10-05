-- Add receipt number generator function
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM insurance_payments
  WHERE receipt_number LIKE 'RCP-%';
  
  RETURN 'RCP-' || LPAD(next_num::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure insurance_payments has all needed fields
ALTER TABLE insurance_payments 
ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;

-- Add index on payment_date for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_date 
ON insurance_payments(payment_date);