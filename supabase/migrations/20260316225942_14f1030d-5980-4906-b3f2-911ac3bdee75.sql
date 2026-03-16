-- Fix the parent view policy that references auth.users (causing permission denied)
DROP POLICY IF EXISTS "Parents can view their own children" ON public.children;

CREATE POLICY "Parents can view their own children"
  ON public.children FOR SELECT TO authenticated
  USING (
    auth.uid() = parent_id
    OR parent_email = auth.email()
  );

-- Recreate practitioner policies with full CRUD
DROP POLICY IF EXISTS "Practitioners can view all children" ON public.children;
DROP POLICY IF EXISTS "Practitioners can insert children" ON public.children;
DROP POLICY IF EXISTS "Practitioners can update all children" ON public.children;

CREATE POLICY "Practitioners full access"
  ON public.children FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'practitioner'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'practitioner'::app_role));