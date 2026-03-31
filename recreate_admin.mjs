import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'

const supabase = createClient(supabaseUrl, supabaseKey)

async function reset() {
  const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) {
    console.error("listErr", listErr)
    return
  }
  
  const adminUser = listData.users.find(u => u.email === 'admin@pms.com')
  if (adminUser) {
    const { error: delErr } = await supabase.auth.admin.deleteUser(adminUser.id)
    if(delErr) console.error("Error deleting old admin user:", delErr)
    else console.log("Deleted old admin user:", adminUser.id)
  } else {
    console.log("No old user found in listUsers")
  }
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@pms.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: { role: 'admin' }
  })
  
  if (error) console.error("create error:", error)
  else console.log("Created user successfully:", data.user.id)
}
reset()
