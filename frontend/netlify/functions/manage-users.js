import { createClient } from '@supabase/supabase-js'

export const handler = async (event, context) => {
  // Solo aceptamos POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // Obtenemos los headers
  const authHeader = event.headers.authorization
  if (!authHeader) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return { statusCode: 500, body: 'Configuración de servidor incompleta.' }
  }

  // Inicializar Supabase con clave maestra (Service Role)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Verificar JWT de quien hace la solicitud (debe ser admin)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return { statusCode: 401, body: 'Unauthorized o token inválido' }
  }

  // Verificar en base de datos si el usuario que llama es admin
  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!roleData || roleData.role !== 'admin') {
    return { statusCode: 403, body: 'Forbidden. No tienes permisos de administrador.' }
  }

  // Procesar Body
  let body
  try {
    body = JSON.parse(event.body)
  } catch (err) {
    return { statusCode: 400, body: 'Bad Request' }
  }

  const { action, payload } = body

  try {
    if (action === 'createUser') {
      const { email, password, role, fullName } = payload
      
      // Crear en auth.users
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true // Como no enviamos mail de confirmación, lo damos por validado
      })

      if (authError) throw authError

      // Crear en user_roles con requires_password_change = true
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert([{ 
          user_id: authData.user.id, 
          role: role,
          requires_password_change: true 
        }])

      if (roleError) throw roleError

      // Si es repartidor, crear la entrada en la tabla drivers
      if (role === 'repartidor') {
        const { error: driverError } = await supabaseAdmin
          .from('drivers')
          .insert([{
            user_id: authData.user.id,
            full_name: fullName || email.split('@')[0], // Fallback por si acaso
            status: 'En Base',
            is_online: false,
            cash_collected: 0,
            transfer_collected: 0
          }])
        
        if (driverError) throw driverError
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Usuario creado exitosamente', user: authData.user })
      }
    } 
    else if (action === 'resetPassword') {
      const { userId, newPassword } = payload

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (authError) throw authError

      // Forzar que lo cambie de nuevo
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ requires_password_change: true })
        .eq('user_id', userId)

      if (roleError) throw roleError

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Contraseña restablecida exitosamente' })
      }
    }
    else {
      return { statusCode: 400, body: 'Acción no válida' }
    }
  } catch (error) {
    console.error('Error interno:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Error procesando la solicitud' })
    }
  }
}
