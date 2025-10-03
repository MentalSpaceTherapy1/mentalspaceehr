-- Drop existing foreign key constraints if they exist
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_primary_therapist_id_fkey;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_psychiatrist_id_fkey;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_case_manager_id_fkey;

ALTER TABLE public.emergency_contacts
  DROP CONSTRAINT IF EXISTS emergency_contacts_client_id_fkey;

-- Re-add foreign key constraints for therapist assignments
ALTER TABLE public.clients
  ADD CONSTRAINT clients_primary_therapist_id_fkey 
  FOREIGN KEY (primary_therapist_id) 
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_psychiatrist_id_fkey 
  FOREIGN KEY (psychiatrist_id) 
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_case_manager_id_fkey 
  FOREIGN KEY (case_manager_id) 
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Add foreign key for emergency contacts
ALTER TABLE public.emergency_contacts
  ADD CONSTRAINT emergency_contacts_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES public.clients(id)
  ON DELETE CASCADE;