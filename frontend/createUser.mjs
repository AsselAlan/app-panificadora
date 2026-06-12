import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wktkoqkqloiojockytgr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdGtvcWtxbG9pb2pvY2t5dGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTQ0OTUsImV4cCI6MjA5NjE3MDQ5NX0.WQ1WypKi0Q0jcSpz-IajHol385qRdkV5idRdhemW210'
const supabase = createClient(supabaseUrl, supabaseKey)

async function createUsers() {
  const users = [
    { email: 'carlos@panificadora.com', password: 'password123' },
    { email: 'roberto@panificadora.com', password: 'password123' },
    { email: 'mostrador@panificadora.com', password: 'password123' }
  ]

  for (const user of users) {
    console.log(`Signing up ${user.email}...`)
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password
    })
    
    if (error) {
      console.error(`Error for ${user.email}:`, error.message)
    } else {
      console.log(`Success for ${user.email}: ID ${data.user?.id}`)
    }
  }
}

createUsers()
