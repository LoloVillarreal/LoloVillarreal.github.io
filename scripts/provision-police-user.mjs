// Run only on a trusted admin computer. Never add these environment values to Vite or GitHub Pages.
import { createClient } from '@supabase/supabase-js'
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLICE_EMAIL, POLICE_PASSWORD }=process.env
if(!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!POLICE_EMAIL||!POLICE_PASSWORD)throw Error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLICE_EMAIL and POLICE_PASSWORD in the local process environment.')
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(POLICE_EMAIL)||/\.(invalid|example|test)$/i.test(POLICE_EMAIL))throw Error('Use the real email provided by the owner.')
const admin=createClient(SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const membership=await admin.from('police_members').select('user_id').eq('alias','lolo').maybeSingle()
if(membership.error)throw membership.error
if(membership.data)throw Error('Alias already assigned; nothing changed.')
const {data,error}=await admin.auth.admin.createUser({email:POLICE_EMAIL,password:POLICE_PASSWORD,email_confirm:true,user_metadata:{display_name:'Lolo'}})
if(error)throw error // Existing accounts are never reset or reused implicitly.
const result=await admin.from('police_members').insert({user_id:data.user.id,alias:'lolo'})
if(result.error){await admin.auth.admin.deleteUser(data.user.id);throw result.error}
console.log('Lolo account linked. No credentials were written to disk.')
