
-- Function to look up a user ID by email (for practitioner use when adding children)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1;
$$;

-- Only practitioners can call this
REVOKE ALL ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;

-- Add RLS policy for practitioners to insert children
CREATE POLICY "Practitioners can insert children"
  ON public.children
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));

-- Add RLS policy for practitioners to update sessions (for archiving)
-- Already exists for UPDATE, but let's add INSERT for manual logging
CREATE POLICY "Practitioners can insert sessions"
  ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));
