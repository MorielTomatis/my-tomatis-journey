-- Drop and recreate the practitioner insert policy to ensure it works
DROP POLICY IF EXISTS "Practitioners can insert children" ON public.children;

CREATE POLICY "Practitioners can insert children"
  ON public.children FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));