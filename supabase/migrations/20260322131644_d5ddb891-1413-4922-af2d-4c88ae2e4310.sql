CREATE OR REPLACE FUNCTION public.is_registered_client(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.children
    WHERE lower(parent_email) = lower(_email)
  )
$$;

CREATE OR REPLACE FUNCTION public.link_my_children()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  UPDATE public.children
  SET parent_id = auth.uid()
  WHERE lower(parent_email) = lower(_email)
    AND parent_id IS NULL;
END;
$$;

DROP POLICY IF EXISTS "Parents can view own sessions" ON public.sessions;
CREATE POLICY "Parents can view own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
);

DROP POLICY IF EXISTS "Parents can insert own sessions" ON public.sessions;
CREATE POLICY "Parents can insert own sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
);

DROP POLICY IF EXISTS "Users can view sessions for their children" ON public.sessions;
CREATE POLICY "Users can view sessions for their children"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR children.user_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
  OR has_role(auth.uid(), 'practitioner'::app_role)
);

DROP POLICY IF EXISTS "Users can insert sessions for their children" ON public.sessions;
CREATE POLICY "Users can insert sessions for their children"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR children.user_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
  OR has_role(auth.uid(), 'practitioner'::app_role)
);

DROP POLICY IF EXISTS "Users can update sessions for their children" ON public.sessions;
CREATE POLICY "Users can update sessions for their children"
ON public.sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR children.user_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
  OR has_role(auth.uid(), 'practitioner'::app_role)
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.children
    WHERE children.id = sessions.child_id
      AND (
        children.parent_id = auth.uid()
        OR children.user_id = auth.uid()
        OR lower(children.parent_email) = lower(auth.email())
      )
  )
  OR has_role(auth.uid(), 'practitioner'::app_role)
);