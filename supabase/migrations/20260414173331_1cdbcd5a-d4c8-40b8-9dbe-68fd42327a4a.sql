
CREATE OR REPLACE FUNCTION public.notify_phase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _previous_phase INTEGER;
  _new_phase INTEGER;
  _is_inactive BOOLEAN;
  _client_name TEXT;
  _today TEXT;
  _supabase_url TEXT;
  _service_key TEXT;
  _request_body TEXT;
BEGIN
  -- Only fire when current_phase actually changed
  IF OLD.current_phase = NEW.current_phase AND OLD.is_active = NEW.is_active THEN
    RETURN NEW;
  END IF;

  -- Only fire on automatic +1 increment or phase 6 completion
  IF NEW.current_phase = OLD.current_phase + 1 THEN
    _previous_phase := OLD.current_phase;
    _new_phase := NEW.current_phase;
    _is_inactive := false;
  ELSIF OLD.current_phase = 6 AND OLD.is_active = true AND NEW.is_active = false THEN
    _previous_phase := 6;
    _new_phase := 6;
    _is_inactive := true;
  ELSE
    RETURN NEW;
  END IF;

  _client_name := NEW.first_name || ' ' || NEW.last_name;
  _today := to_char(now(), 'DD/MM/YYYY');

  -- Use the vault secret set by email infrastructure setup
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1;

  -- Get supabase URL from config or construct it
  _supabase_url := 'https://jiuifohlhuotatgqtpec.supabase.co';

  IF _service_key IS NULL THEN
    RAISE WARNING 'notify_phase_completion: missing service key in vault, skipping email';
    RETURN NEW;
  END IF;

  _request_body := json_build_object(
    'templateName', 'phase-completion',
    'recipientEmail', 'info@tomatis-harish.com',
    'idempotencyKey', 'phase-complete-' || NEW.id || '-' || _previous_phase,
    'templateData', json_build_object(
      'clientName', _client_name,
      'previousPhase', _previous_phase,
      'newPhase', _new_phase,
      'completionDate', _today,
      'isInactive', _is_inactive
    )
  )::text;

  PERFORM net.http_post(
    url := _supabase_url || '/functions/v1/send-transactional-email',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    )::jsonb,
    body := _request_body::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_phase_completion failed: %', SQLERRM;
  RETURN NEW;
END;
$$;
