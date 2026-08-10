-- backend/update_v0.14_fix_execute_warnings.sql

-- Revoke from public and anon to fix "Public Can Execute"
REVOKE EXECUTE ON FUNCTION public.apply_stock_update(jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.apply_stock_update(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_stock_update(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.clear_password_change_flag() FROM public;
REVOKE EXECUTE ON FUNCTION public.clear_password_change_flag() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_password_change_flag() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM public;
REVOKE EXECUTE ON FUNCTION public.get_auth_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;

-- handle_updated_at is a trigger function, nobody should execute it directly
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.process_driver_end_of_day(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.process_driver_end_of_day(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_driver_end_of_day(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.process_offline_sale(jsonb) FROM public;
REVOKE EXECUTE ON FUNCTION public.process_offline_sale(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_offline_sale(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.revert_stock_update(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.revert_stock_update(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.revert_stock_update(uuid) TO authenticated;
