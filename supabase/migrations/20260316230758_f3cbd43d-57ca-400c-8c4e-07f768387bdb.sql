-- Verify parent_id remains optional
ALTER TABLE public.children ALTER COLUMN parent_id DROP NOT NULL;

-- Replace practitioner access with explicit CRUD policies
DROP POLICY IF EXISTS "Practitioners full access" ON public.children;
DROP POLICY IF EXISTS "Practitioners can view all children" ON public.children;
DROP POLICY IF EXISTS "Practitioners can insert children" ON public.children;
DROP POLICY IF EXISTS "Practitioners can update all children" ON public.children;
DROP POLICY IF EXISTS "Practitioners can delete all children" ON public.children;

CREATE POLICY "Practitioners can view all children"
  ON public.children
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'practitioner'::app_role));

CREATE POLICY "Practitioners can insert children"
  ON public.children
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));

CREATE POLICY "Practitioners can update all children"
  ON public.children
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'practitioner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));

CREATE POLICY "Practitioners can delete all children"
  ON public.children
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'practitioner'::app_role));