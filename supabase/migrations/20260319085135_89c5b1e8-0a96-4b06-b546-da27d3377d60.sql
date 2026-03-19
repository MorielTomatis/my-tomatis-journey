
-- Fix children table: drop and recreate policies that reference auth.users
DROP POLICY IF EXISTS "Users can view their own children" ON public.children;
DROP POLICY IF EXISTS "Users can update their own children" ON public.children;

CREATE POLICY "Users can view their own children" ON public.children
  FOR SELECT TO public
  USING (
    auth.uid() = parent_id
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'practitioner'::app_role)
  );

CREATE POLICY "Users can update their own children" ON public.children
  FOR UPDATE TO public
  USING (
    auth.uid() = parent_id
    OR auth.uid() = user_id
    OR has_role(auth.uid(), 'practitioner'::app_role)
  );

-- Fix sessions table: drop and recreate policies that reference auth.users
DROP POLICY IF EXISTS "Users can view sessions for their children" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert sessions for their children" ON public.sessions;

CREATE POLICY "Users can view sessions for their children" ON public.sessions
  FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
        AND (children.parent_id = auth.uid() OR children.user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'practitioner'::app_role)
  );

CREATE POLICY "Users can insert sessions for their children" ON public.sessions
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = sessions.child_id
        AND (children.parent_id = auth.uid() OR children.user_id = auth.uid())
    )
    OR has_role(auth.uid(), 'practitioner'::app_role)
  );
