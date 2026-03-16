
-- Function to auto-advance phase after 14 intensive sessions
CREATE OR REPLACE FUNCTION public.check_phase_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_phase INTEGER;
  _session_count INTEGER;
BEGIN
  -- Only proceed if passive was completed
  IF NOT NEW.passive_completed THEN
    RETURN NEW;
  END IF;

  -- Get the child's current phase
  SELECT current_phase INTO _current_phase
  FROM public.children
  WHERE id = NEW.child_id;

  -- Only auto-advance for intensive phases (1, 3, 5)
  IF _current_phase NOT IN (1, 3, 5) THEN
    RETURN NEW;
  END IF;

  -- Count total passive sessions logged during this phase
  -- We count all sessions for this child where passive_completed = true
  -- that were logged since the last phase change (approximated by counting all sessions in current state)
  SELECT COUNT(*) INTO _session_count
  FROM public.sessions
  WHERE child_id = NEW.child_id
    AND passive_completed = true;

  -- Include the current insert (trigger fires AFTER insert, so it's already counted)
  -- If count reaches 14, advance to next phase
  IF _session_count >= 14 THEN
    UPDATE public.children
    SET current_phase = _current_phase + 1
    WHERE id = NEW.child_id
      AND current_phase = _current_phase;  -- safety check
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger that fires after each session insert
CREATE TRIGGER check_phase_advance_trigger
  AFTER INSERT ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_phase_advance();
