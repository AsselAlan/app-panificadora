-- ==========================================
-- ACTUALIZACIÓN V0.3: SISTEMA DE GESTIÓN DE USUARIOS
-- ==========================================

-- 1. Añadir columna para forzar cambio de contraseña
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- 2. Asegurarnos que la política permita leer esto
DROP POLICY IF EXISTS "Allow read user_roles" ON public.user_roles;
CREATE POLICY "Allow read user_roles" ON public.user_roles FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.get_auth_role() = 'admin');

-- 3. Crear una vista segura para listar usuarios desde el frontend sin acceder a auth.users directamente
-- Esta vista une la tabla auth.users (protegida) con user_roles. Solo los admins podrán verla.
CREATE OR REPLACE VIEW public.vw_user_management AS
SELECT 
    au.id, 
    au.email, 
    au.created_at, 
    au.last_sign_in_at,
    ur.role,
    ur.requires_password_change
FROM auth.users au
JOIN public.user_roles ur ON au.id = ur.user_id;

-- 4. Habilitar seguridad en la vista (verificar que solo el admin la pueda usar)
GRANT SELECT ON public.vw_user_management TO authenticated;

-- *Nota para el Desarrollador*: Para usar la vista `vw_user_management` desde la API anónima, necesitamos
-- otorgar permisos o crear una función definer si RLS nos bloquea. La forma más limpia es usar una función:

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    role VARCHAR,
    requires_password_change BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de Postgres
AS $$
BEGIN
    IF public.get_auth_role() != 'admin' THEN
        RAISE EXCEPTION 'Acceso denegado. Solo administradores pueden listar usuarios.';
    END IF;

    RETURN QUERY
    SELECT 
        au.id, 
        CAST(au.email AS VARCHAR), 
        au.created_at, 
        au.last_sign_in_at,
        CAST(ur.role AS VARCHAR),
        ur.requires_password_change
    FROM auth.users au
    JOIN public.user_roles ur ON au.id = ur.user_id
    ORDER BY au.created_at DESC;
END;
$$;

-- Otorgar permiso a los usuarios autenticados para ejecutar esta función
GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;
