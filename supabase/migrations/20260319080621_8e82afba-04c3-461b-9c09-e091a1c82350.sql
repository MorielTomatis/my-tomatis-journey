-- Allow users to insert their own profile (adult clients with user_id)
CREATE POLICY "Adult clients can insert own profile"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile via user_id
CREATE POLICY "Adult clients can update own profile"
ON public.children
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);