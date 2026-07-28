CREATE OR REPLACE FUNCTION public.team_list_clients()
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  project_title text,
  industry text,
  contact_person text,
  phone text,
  email text,
  notes text,
  brand_colors jsonb,
  brand_fonts jsonb,
  service_type text,
  deliverables jsonb,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.project_title, c.industry, c.contact_person,
         c.phone, c.email, c.notes, c.brand_colors, c.brand_fonts,
         c.service_type, c.deliverables, c.is_active
  FROM public.clients c
  WHERE c.is_active = true
    AND (
      public.is_admin()
      OR public.has_role(auth.uid(), 'editor')
      OR public.has_role(auth.uid(), 'designer')
      OR public.has_role(auth.uid(), 'writer')
      OR public.has_role(auth.uid(), 'camera_operator')
      OR public.has_role(auth.uid(), 'social_executive')
    )
  ORDER BY c.name;
$$;

REVOKE ALL ON FUNCTION public.team_list_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_list_clients() TO authenticated;