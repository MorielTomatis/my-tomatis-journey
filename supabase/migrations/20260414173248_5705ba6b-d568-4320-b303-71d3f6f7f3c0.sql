
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function that sends the phase completion email notification
CREATE OR REPLACE FUNCTION public.notify_phase_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _child RECORD;
  _previous_phase INTEGER;
  _new_phase INTEGER;
  _is_inactive BOOLEAN;
  _client_name TEXT;
  _today TEXT;
  _supabase_url TEXT;
  _service_key TEXT;
  _request_body TEXT;
BEGIN
  -- Only fire when current_phase actually changed (phase advance)
  IF OLD.current_phase = NEW.current_phase THEN
    RETURN NEW;
  END IF;

  -- Only fire on the automatic increment (new phase = old phase + 1)
  -- or when phase 6 completes (is_active goes false)
  IF NEW.current_phase != OLD.current_phase + 1 
     AND NOT (OLD.current_phase = 6 AND OLD.is_active = true AND NEW.is_active = false) THEN
    RETURN NEW;
  END IF;

  _previous_phase := OLD.current_phase;
  _new_phase := NEW.current_phase;
  _is_inactive := (OLD.current_phase = 6 AND NEW.is_active = false);
  _client_name := NEW.first_name || ' ' || NEW.last_name;
  _today := to_char(now(), 'DD/MM/YYYY');

  -- Get Supabase URL and service role key from vault
  SELECT decrypted_secret INTO _supabase_url
    FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1;
  SELECT decrypted_secret INTO _service_key
    FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key' LIMIT 1;

  -- Fallback to env vars if vault doesn't have them
  IF _supabase_url IS NULL THEN
    _supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  IF _service_key IS NULL THEN
    _service_key := current_setting('app.settings.supabase_service_role_key', true);
  END IF;

  -- If we can't get credentials, fail silently
  IF _supabase_url IS NULL OR _service_key IS NULL THEN
    RAISE WARNING 'notify_phase_completion: missing supabase credentials, skipping email';
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

  -- Call send-transactional-email via pg_net (async, non-blocking)
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
  -- Fail silently - don't block phase advancement
  RAISE WARNING 'notify_phase_completion failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on children table AFTER update (fires after check_phase_advance updates the row)
DROP TRIGGER IF EXISTS trigger_notify_phase_completion ON public.children;
CREATE TRIGGER trigger_notify_phase_completion
  AFTER UPDATE OF current_phase, is_active ON public.children
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_phase_completion();
