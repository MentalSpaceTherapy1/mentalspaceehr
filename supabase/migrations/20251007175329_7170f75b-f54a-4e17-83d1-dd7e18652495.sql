-- Fix search_path for all security definer functions to prevent search path attacks
-- This ensures functions execute with a predictable schema search order

-- Update generate_payment_id function
CREATE OR REPLACE FUNCTION public.generate_payment_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(payment_id FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM payment_records
  WHERE payment_id LIKE 'PAY-%';
  
  RETURN 'PAY-' || LPAD(next_num::TEXT, 6, '0');
END;
$function$;

-- Update cleanup_expired_devices function
CREATE OR REPLACE FUNCTION public.cleanup_expired_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.trusted_devices
  WHERE expires_at < NOW();
END;
$function$;

-- Update generate_statement_id function
CREATE OR REPLACE FUNCTION public.generate_statement_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(statement_id FROM 6) AS INTEGER)), 0) + 1
  INTO next_num
  FROM client_statements
  WHERE statement_id LIKE 'STMT-%';
  
  RETURN 'STMT-' || LPAD(next_num::TEXT, 6, '0');
END;
$function$;

-- Update generate_mrn function
CREATE OR REPLACE FUNCTION public.generate_mrn()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_mrn TEXT;
  mrn_exists BOOLEAN;
BEGIN
  LOOP
    new_mrn := 'MH' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.clients WHERE medical_record_number = new_mrn) INTO mrn_exists;
    IF NOT mrn_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_mrn;
END;
$function$;

-- Update track_document_view function
CREATE OR REPLACE FUNCTION public.track_document_view(document_id uuid, viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_views jsonb;
BEGIN
  SELECT viewed_by INTO current_views
  FROM client_documents
  WHERE id = document_id;
  
  IF current_views IS NULL THEN
    current_views := '[]'::jsonb;
  END IF;
  
  UPDATE client_documents
  SET 
    viewed_by = current_views || jsonb_build_object(
      'userId', viewer_id,
      'viewedDate', now()
    ),
    client_viewed_date = CASE 
      WHEN EXISTS (SELECT 1 FROM clients WHERE portal_user_id = viewer_id)
      THEN now()
      ELSE client_viewed_date
    END
  WHERE id = document_id;
END;
$function$;

-- Update validate_telehealth_licensure function
CREATE OR REPLACE FUNCTION public.validate_telehealth_licensure(_client_id uuid, _clinician_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM clients c
    JOIN profiles p ON p.id = _clinician_id
    WHERE c.id = _client_id
    AND c.state = ANY(p.licensed_states)
  );
END;
$function$;

-- Update calculate_compliance_status function
CREATE OR REPLACE FUNCTION public.calculate_compliance_status(p_session_date date, p_days_allowed integer DEFAULT 3)
RETURNS TABLE(status text, days_until_due integer, days_overdue integer, due_date date)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_due_date DATE;
  v_days_diff INTEGER;
BEGIN
  v_due_date := p_session_date + p_days_allowed;
  v_days_diff := v_due_date - CURRENT_DATE;
  
  IF v_days_diff > 2 THEN
    RETURN QUERY SELECT 'On Time'::TEXT, v_days_diff, 0, v_due_date;
  ELSIF v_days_diff >= 0 THEN
    RETURN QUERY SELECT 'Due Soon'::TEXT, v_days_diff, 0, v_due_date;
  ELSIF v_days_diff >= -1 THEN
    RETURN QUERY SELECT 'Overdue'::TEXT, 0, ABS(v_days_diff), v_due_date;
  ELSE
    RETURN QUERY SELECT 'Late'::TEXT, 0, ABS(v_days_diff), v_due_date;
  END IF;
END;
$function$;

-- Update create_document_version function
CREATE OR REPLACE FUNCTION public.create_document_version(original_document_id uuid, new_file_path text, new_file_name text, new_file_size integer, uploaded_by_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  new_version_number integer;
  new_document_id uuid;
  original_document record;
BEGIN
  SELECT * INTO original_document
  FROM client_documents
  WHERE id = original_document_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original document not found';
  END IF;
  
  UPDATE client_documents
  SET latest_version = false
  WHERE id = original_document_id;
  
  new_version_number := original_document.version_number + 1;
  
  INSERT INTO client_documents (
    client_id, title, description, document_type, document_category,
    file_path, file_name, file_size_bytes, mime_type, uploaded_by,
    uploaded_date, uploaded_method, document_source, document_date,
    version_number, previous_version_id, latest_version, status, tags
  ) VALUES (
    original_document.client_id, original_document.title, original_document.description,
    original_document.document_type, original_document.document_category,
    new_file_path, new_file_name, new_file_size, original_document.mime_type,
    uploaded_by_id, now(), 'Version Upload', original_document.document_source,
    original_document.document_date, new_version_number, original_document_id,
    true, original_document.status, original_document.tags
  ) RETURNING id INTO new_document_id;
  
  RETURN new_document_id;
END;
$function$;

-- Update check_appointment_conflict function
CREATE OR REPLACE FUNCTION public.check_appointment_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND clinician_id = NEW.clinician_id
      AND appointment_date = NEW.appointment_date
      AND status NOT IN ('Cancelled', 'No Show', 'Rescheduled')
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Appointment conflict detected for this clinician at the specified time';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM public.blocked_times
    WHERE clinician_id = NEW.clinician_id
      AND NEW.appointment_date BETWEEN start_date AND end_date
      AND (
        (NEW.start_time >= start_time AND NEW.start_time < end_time)
        OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
        OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
      )
  ) THEN
    RAISE EXCEPTION 'Cannot schedule appointment during blocked time';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update update_waiting_room_updated_at function
CREATE OR REPLACE FUNCTION public.update_waiting_room_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Update update_last_modified_column function
CREATE OR REPLACE FUNCTION public.update_last_modified_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.last_modified = NOW();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$function$;

-- Update log_appointment_changes function
CREATE OR REPLACE FUNCTION public.log_appointment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  change_action text;
  change_reason text;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    change_action := 'create';
    INSERT INTO public.appointment_change_logs (
      appointment_id, changed_by, action, new_values
    ) VALUES (
      NEW.id, auth.uid(), change_action, to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.status != NEW.status AND NEW.status = 'Cancelled') THEN
      change_action := 'cancel';
      change_reason := NEW.cancellation_reason;
    ELSIF (OLD.appointment_date != NEW.appointment_date OR OLD.start_time != NEW.start_time OR OLD.end_time != NEW.end_time) THEN
      change_action := 'reschedule';
    ELSIF (OLD.recurrence_pattern IS DISTINCT FROM NEW.recurrence_pattern) THEN
      change_action := 'recurrence_update';
    ELSIF (OLD.status != NEW.status) THEN
      change_action := 'status_change';
    ELSE
      change_action := 'update';
    END IF;
    
    INSERT INTO public.appointment_change_logs (
      appointment_id, changed_by, action, old_values, new_values, reason
    ) VALUES (
      NEW.id, auth.uid(), change_action, to_jsonb(OLD), to_jsonb(NEW), change_reason
    );
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update prevent_appointment_deletion function
CREATE OR REPLACE FUNCTION public.prevent_appointment_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RAISE EXCEPTION 'Deleting appointments is not allowed. Please cancel the appointment instead.';
END;
$function$;

-- Update generate_confirmation_token function
CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$function$;

-- Update find_matching_slots function
CREATE OR REPLACE FUNCTION public.find_matching_slots(_waitlist_id uuid)
RETURNS TABLE(appointment_date date, start_time time without time zone, end_time time without time zone, clinician_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    a.appointment_date, a.start_time, a.end_time, a.clinician_id
  FROM appointments a
  INNER JOIN appointment_waitlist w ON w.id = _waitlist_id
  WHERE a.status = 'Cancelled'
    AND a.clinician_id = ANY(COALESCE(w.alternate_clinician_ids, ARRAY[]::UUID[]) || ARRAY[w.clinician_id])
    AND a.appointment_type = w.appointment_type
    AND EXTRACT(DOW FROM a.appointment_date)::TEXT = ANY(w.preferred_days)
    AND a.appointment_date > CURRENT_DATE
  ORDER BY a.appointment_date, a.start_time
  LIMIT 10;
END;
$function$;

-- Update detect_breach_indicators function
CREATE OR REPLACE FUNCTION public.detect_breach_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  access_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO access_count
  FROM portal_access_log 
  WHERE user_id = NEW.user_id 
  AND created_at > NOW() - INTERVAL '1 hour';
  
  IF access_count > 50 THEN
    INSERT INTO security_incidents (
      incident_type, severity, description, user_id, ip_address, detected_at
    ) VALUES (
      'Suspicious Access Pattern', 'High',
      'Unusual bulk PHI access detected: ' || access_count || ' records in 1 hour',
      NEW.user_id, NEW.ip_address, NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update generate_receipt_number function
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM insurance_payments
  WHERE receipt_number LIKE 'RCP-%';
  
  RETURN 'RCP-' || LPAD(next_num::TEXT, 6, '0');
END;
$function$;

-- Update update_insurance_claims_modified function
CREATE OR REPLACE FUNCTION public.update_insurance_claims_modified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.last_modified = NOW();
  NEW.last_modified_by = auth.uid();
  RETURN NEW;
END;
$function$;