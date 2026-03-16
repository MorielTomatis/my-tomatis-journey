
-- Fix phase advance trigger: archive sessions upon phase change and count only unarchived
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

  -- Count unarchived passive sessions for this child
  SELECT COUNT(*) INTO _session_count
  FROM public.sessions
  WHERE child_id = NEW.child_id
    AND passive_completed = true
    AND is_archived = false;

  IF _session_count >= 14 THEN
    -- Archive all current unarchived sessions before advancing
    UPDATE public.sessions
    SET is_archived = true
    WHERE child_id = NEW.child_id
      AND is_archived = false;

    IF _current_phase = 6 THEN
      UPDATE public.children
      SET is_active = false
      WHERE id = NEW.child_id
        AND current_phase = 6;
    ELSE
      UPDATE public.children
      SET current_phase = _current_phase + 1
      WHERE id = NEW.child_id
        AND current_phase = _current_phase;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Retroactive fix: calculate correct phase from total sessions and fix data
DO $$
DECLARE
  _child RECORD;
  _total_passive INTEGER;
  _correct_phase INTEGER;
  _sessions_in_current_phase INTEGER;
  _sessions_to_archive INTEGER;
BEGIN
  FOR _child IN SELECT id, current_phase FROM public.children LOOP
    -- Count total passive sessions
    SELECT COUNT(*) INTO _total_passive
    FROM public.sessions
    WHERE child_id = _child.id
      AND passive_completed = true;

    -- Each phase = 14 sessions, max 6 phases
    _correct_phase := LEAST((_total_passive / 14) + 1, 6);
    _sessions_in_current_phase := _total_passive - ((_correct_phase - 1) * 14);

    -- Update phase if wrong
    IF _child.current_phase != _correct_phase THEN
      UPDATE public.children
      SET current_phase = _correct_phase
      WHERE id = _child.id;
    END IF;

    -- Archive all sessions except the ones belonging to the current phase
    -- (the most recent _sessions_in_current_phase sessions stay unarchived)
    _sessions_to_archive := _total_passive - _sessions_in_current_phase;
    IF _sessions_to_archive > 0 THEN
      UPDATE public.sessions
      SET is_archived = true
      WHERE id IN (
        SELECT s.id FROM public.sessions s
        WHERE s.child_id = _child.id
          AND s.passive_completed = true
        ORDER BY s.date ASC, s.created_at ASC
        LIMIT _sessions_to_archive
      );
    END IF;

    -- Ensure current phase sessions are NOT archived
    UPDATE public.sessions
    SET is_archived = false
    WHERE id IN (
      SELECT s.id FROM public.sessions s
      WHERE s.child_id = _child.id
        AND s.passive_completed = true
        AND s.is_archived = true
      ORDER BY s.date DESC, s.created_at DESC
      LIMIT _sessions_in_current_phase
    );
  END LOOP;
END;
$$;
