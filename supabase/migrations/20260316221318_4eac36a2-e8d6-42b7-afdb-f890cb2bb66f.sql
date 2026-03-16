
-- Add unique constraint for upsert on children
CREATE UNIQUE INDEX IF NOT EXISTS children_parent_name_unique 
  ON public.children (parent_id, first_name, last_name);

-- Add unique constraint for upsert on sessions (one session per child per day)
CREATE UNIQUE INDEX IF NOT EXISTS sessions_child_date_unique 
  ON public.sessions (child_id, date);
