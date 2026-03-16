
-- Add is_active to children
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Add is_archived to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- Replace the phase advance trigger function to account for is_archived and program completion
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
  IF NOT NEW.passive_completed THEN
    RETURN NEW;
  END IF;

  SELECT current_phase INTO _current_phase
  FROM public.children
  WHERE id = NEW.child_id;

  -- Only auto-advance for intensive phases (1, 3, 5) AND consolidation phases (2, 4, 6)
  -- All phases advance after 14 unarchived passive sessions
  
  -- Count unarchived passive sessions for this child
  SELECT COUNT(*) INTO _session_count
  FROM public.sessions
  WHERE child_id = NEW.child_id
    AND passive_completed = true
    AND is_archived = false;

  IF _session_count >= 14 THEN
    IF _current_phase = 6 THEN
      -- Program complete: deactivate child
      UPDATE public.children
      SET is_active = false
      WHERE id = NEW.child_id
        AND current_phase = 6;
    ELSE
      -- Advance to next phase
      UPDATE public.children
      SET current_phase = _current_phase + 1
      WHERE id = NEW.child_id
        AND current_phase = _current_phase;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
