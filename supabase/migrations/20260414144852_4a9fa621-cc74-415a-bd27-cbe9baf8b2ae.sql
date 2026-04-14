
-- Create resources table for guide videos
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  category TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view active resources
CREATE POLICY "Authenticated users can view active resources"
ON public.resources FOR SELECT TO authenticated
USING (is_active = true);

-- Practitioners can view all resources (including inactive)
CREATE POLICY "Practitioners can view all resources"
ON public.resources FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'practitioner'::app_role));

-- Practitioners can insert resources
CREATE POLICY "Practitioners can insert resources"
ON public.resources FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'practitioner'::app_role));

-- Practitioners can update resources
CREATE POLICY "Practitioners can update resources"
ON public.resources FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'practitioner'::app_role));

-- Practitioners can delete resources
CREATE POLICY "Practitioners can delete resources"
ON public.resources FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'practitioner'::app_role));

-- Seed with initial video
INSERT INTO public.resources (title, youtube_url, category, sort_order)
VALUES ('עבודה עם המיקרופון — הסבר מלא', 'https://youtu.be/JAEKqDUQFxk', 'עבודה עם המיקרופון', 1);
