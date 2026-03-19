
CREATE OR REPLACE FUNCTION public.is_registered_client(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.children
    WHERE parent_email = lower(_email)
  )
$$;
