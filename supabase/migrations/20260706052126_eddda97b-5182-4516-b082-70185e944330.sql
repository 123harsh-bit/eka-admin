REVOKE EXECUTE ON FUNCTION public.create_script(text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_script(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_script(text, uuid, uuid) TO authenticated;