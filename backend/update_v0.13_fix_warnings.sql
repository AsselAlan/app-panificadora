-- backend/update_v0.13_fix_warnings.sql

-- 1. Fix Function Search Path Mutable
ALTER FUNCTION public.apply_stock_update(payload jsonb) SET search_path = public;
ALTER FUNCTION public.clear_password_change_flag() SET search_path = public;
ALTER FUNCTION public.get_all_users() SET search_path = public;
ALTER FUNCTION public.get_auth_role() SET search_path = public;
ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.process_driver_end_of_day(p_driver_id uuid) SET search_path = public;
ALTER FUNCTION public.process_offline_sale(payload jsonb) SET search_path = public;
ALTER FUNCTION public.revert_stock_update(p_update_id uuid) SET search_path = public;

-- 2. Fix Extension in Public
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 3. Fix RLS Policies Always True
DO $$
DECLARE
    pol RECORD;
    create_stmt TEXT;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check 
        FROM pg_policies 
        WHERE qual = 'true' OR with_check = 'true'
    LOOP
        -- Drop the old policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        
        -- Build the new policy
        -- Roles array is enclosed in curly braces like '{public}', need to clean it up for the CREATE stmt
        create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s ', 
                              pol.policyname, pol.schemaname, pol.tablename, pol.cmd, 
                              replace(replace(pol.roles::text, '{', ''), '}', ''));
        
        IF pol.qual = 'true' THEN
            create_stmt := create_stmt || ' USING (auth.uid() IS NOT NULL) ';
        ELSIF pol.qual IS NOT NULL THEN
            create_stmt := create_stmt || format(' USING (%s) ', pol.qual);
        END IF;
        
        IF pol.with_check = 'true' THEN
            create_stmt := create_stmt || ' WITH CHECK (auth.uid() IS NOT NULL) ';
        ELSIF pol.with_check IS NOT NULL THEN
            create_stmt := create_stmt || format(' WITH CHECK (%s) ', pol.with_check);
        END IF;
        
        EXECUTE create_stmt;
    END LOOP;
END;
$$;
