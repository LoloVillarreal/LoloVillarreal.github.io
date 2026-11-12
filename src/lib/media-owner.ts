import config from '../data/cloud-config.json'

// Keep the same storage key as existing installations. This hint selects only
// downloaded public media; it must never grant access to account screens or data.
export const sessionStorageKey='sb-'+new URL(config.url).hostname.split('.')[0]+'-auth-token'
export function rememberedMediaOwner(online:boolean):string|null {
  try {
    const session=JSON.parse(localStorage.getItem(sessionStorageKey)??'null')
    if(!Number.isFinite(session?.expires_at)||online&&session.expires_at*1000>Date.now()+90000)return null
    return typeof session?.user?.id==='string'&&/^[0-9a-f-]{36}$/i.test(session.user.id)&&typeof session?.refresh_token==='string'&&session.refresh_token.length
      ?session.user.id:null
  }catch{return null}
}
