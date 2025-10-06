-- Add missing foreign key from insurance_claims to clients
ALTER TABLE public.insurance_claims
ADD CONSTRAINT insurance_claims_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add missing foreign key from insurance_claims to profiles (billing provider)
ALTER TABLE public.insurance_claims
ADD CONSTRAINT insurance_claims_billing_provider_id_fkey
FOREIGN KEY (billing_provider_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;