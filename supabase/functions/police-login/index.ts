import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
const url=Deno.env.get('SUPABASE_URL')!
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
Deno.serve(async request=>{
  const origin=request.headers.get('origin')??''
  const allowed=origin==='https://lolovillarreal.github.io'||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':allowed?origin:'https://lolovillarreal.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'}
  const reply=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers})
  if(request.method==='OPTIONS')return new Response(null,{headers})
  if(request.method!=='POST'||(origin&&!allowed))return reply({error:'Solicitud no permitida.'},403)
  try{
    const body=await request.text();if(body.length>4096)return reply({error:'Solicitud no válida.'},400)
    const {alias,password}=JSON.parse(body)
    if(typeof alias!=='string'||typeof password!=='string'||alias.length>40||password.length>200||!password)return reply({error:'Introduce tu alias y contraseña.'},400)
    const {data:member}=await admin.from('police_members').select('user_id').eq('alias',alias.trim().toLowerCase()).maybeSingle()
    if(!member)return reply({error:'No se pudo iniciar sesión. Comprueba el acceso configurado y tus credenciales.'},401)
    const {data:{user}}=await admin.auth.admin.getUserById(member.user_id)
    if(!user?.email)return reply({error:'Acceso no disponible.'},401)
    const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
    const {data,error}=await auth.auth.signInWithPassword({email:user.email,password})
    if(error||!data.session)return reply({error:'No se pudo iniciar sesión. Revisa tus credenciales o espera antes de reintentar.'},401)
    return reply({access_token:data.session.access_token,refresh_token:data.session.refresh_token})
  }catch{return reply({error:'No se pudo conectar. Reintenta con conexión.'},503)}
})
