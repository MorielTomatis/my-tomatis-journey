
-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('parent', 'practitioner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Practitioners can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'practitioner'));

-- 2. Children table
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  current_phase INTEGER NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 6),
  passive_duration INTEGER NOT NULL DEFAULT 40 CHECK (passive_duration IN (40, 60)),
  consolidation_weeks INTEGER NOT NULL DEFAULT 4 CHECK (consolidation_weeks IN (4, 5, 6)),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view their own children"
  ON public.children FOR SELECT
  USING (auth.uid() = parent_id);

CREATE POLICY "Parents can insert their own children"
  ON public.children FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "Practitioners can view all children"
  ON public.children FOR SELECT
  USING (public.has_role(auth.uid(), 'practitioner'));

CREATE POLICY "Practitioners can update all children"
  ON public.children FOR UPDATE
  USING (public.has_role(auth.uid(), 'practitioner'));

-- 3. Sessions table (daily logs)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  passive_completed BOOLEAN NOT NULL DEFAULT false,
  active_completed BOOLEAN NOT NULL DEFAULT false,
  active_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, date)
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents can view own sessions"
  ON public.sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
      AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = sessions.child_id
      AND children.parent_id = auth.uid()
    )
  );

CREATE POLICY "Practitioners can view all sessions"
  ON public.sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'practitioner'));

CREATE POLICY "Practitioners can update all sessions"
  ON public.sessions FOR UPDATE
  USING (public.has_role(auth.uid(), 'practitioner'));

-- 4. Timestamp update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_children_updated_at
  BEFORE UPDATE ON public.children
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
