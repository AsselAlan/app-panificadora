import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://xrjoyzcibbfrvbsjjjtl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyam95emNpYmJmcnZic2pqanRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzUwMzIsImV4cCI6MjA5ODc1MTAzMn0.AJqrTF6P7bo3XUS2Dmw3tWSeqsDLdttGI_ineXOz6_g')

async function fixMostrador() {
  const { data: userRoles, error: rolesError } = await supabase.from('user_roles').select('user_id').eq('role', 'mostrador').limit(1)
  
  if (rolesError) {
    console.error('Error fetching roles:', rolesError)
    return
  }

  if (userRoles && userRoles.length > 0) {
    const userId = userRoles[0].user_id
    
    const { data: drivers, error: driversError } = await supabase.from('drivers').select('*').eq('user_id', userId)
    
    if (driversError) {
      console.error('Error checking drivers:', driversError)
      return
    }

    if (drivers.length === 0) {
      console.log('Driver not found, creating Mostrador driver...')
      const { data, error } = await supabase.from('drivers').insert([
        {
          user_id: userId,
          full_name: 'Mostrador',
          status: 'En Base',
          is_online: false,
          cash_collected: 0,
          transfer_collected: 0,
          is_mostrador: true
        }
      ])
      
      if (error) console.error('Insert error:', error)
      else console.log('Driver Mostrador created successfully.')
    } else {
       console.log('Driver already exists, ensuring is_mostrador is true...')
       await supabase.from('drivers').update({is_mostrador: true}).eq('user_id', userId)
    }
  } else {
    console.log('No mostrador user found in user_roles.')
  }
}

fixMostrador()
