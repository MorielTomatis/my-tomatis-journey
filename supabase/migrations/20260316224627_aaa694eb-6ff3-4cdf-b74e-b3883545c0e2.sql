
-- 1. Add parent_email column
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS parent_email text;

-- 2. Make parent_id nullable
ALTER TABLE public.children ALTER COLUMN parent_id DROP NOT NULL;

-- 3. Update RLS: practitioners can insert children (already exists, but parent_id may be null now)
-- Drop old parent insert policy that requires auth.uid() = parent_id (won't work for null)
DROP POLICY IF EXISTS "Parents can insert their own children" ON public.children;

-- Recreate: parents can insert children where parent_id = their uid
CREATE POLICY "Parents can insert their own children"
  ON public.children FOR INSERT TO public
  WITH CHECK (auth.uid() = parent_id);

-- Update parent SELECT to also match by parent_email for unlinked children
DROP POLICY IF EXISTS "Parents can view their own children" ON public.children;
CREATE POLICY "Parents can view their own children"
  ON public.children FOR SELECT TO public
  USING (
    auth.uid() = parent_id
    OR parent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 4. Create function to auto-link children on parent signup/login
CREATE OR REPLACE FUNCTION public.link_children_to_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.children
  SET parent_id = NEW.id
  WHERE parent_email = NEW.email
    AND parent_id IS NULL;
  RETURN NEW;
END;
$$;

-- 5. Attach trigger to auth.users on insert (new signup)
-- Note: We use a DB function called via edge function instead since we can't attach triggers to auth.users
-- Instead, we'll call this from the auth flow. Let's create an RPC for it.
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
  WHERE parent_email = _email
    AND parent_id IS NULL;
END;
$$;
