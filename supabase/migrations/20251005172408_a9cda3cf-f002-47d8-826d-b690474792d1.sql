-- Enhancement 1: Add PDF document URL column to telehealth_consents
ALTER TABLE public.telehealth_consents 
ADD COLUMN IF NOT EXISTS pdf_document_url TEXT;