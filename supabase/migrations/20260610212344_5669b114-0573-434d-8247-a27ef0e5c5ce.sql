
DROP VIEW IF EXISTS public.clients_admin;
DROP FUNCTION IF EXISTS public.clients_admin_guard();

-- Admin-only function returning full client rows
CREATE OR REPLACE FUNCTION public.admin_list_clients()
RETURNS SETOF public.clients
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT * FROM public.clients ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_clients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_client(_id uuid)
RETURNS public.clients
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result public.clients;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO result FROM public.clients WHERE id = _id;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_client(uuid) TO authenticated;
