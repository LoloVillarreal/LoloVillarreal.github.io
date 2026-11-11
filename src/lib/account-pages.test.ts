import { describe, expect, it } from 'vitest'
import { readAccountPages, type AccountRow } from './account-pages'

const rows: AccountRow[] = Array.from({length: 1250}, (_,i)=>({
  key: `progress:${String(i).padStart(5,'0')}`, value:{data:i}, version:1, updated_at:'2026-11-11'
}))

describe('lectura completa de la cuenta',()=>{
  it('recupera cada clave incluso si el servidor limita páginas o hay huecos',async()=>{
    const existing=rows.filter((_,i)=>i%13!==0)
    const result=await readAccountPages(async after=>existing.filter(r=>after===null||r.key>after).slice(0,168))
    expect(result).toEqual(existing)
  })
  it('si falla una página no entrega un conjunto parcial para exportar o restaurar',async()=>{
    const getPage=async(after:string|null)=>{
      if(after!==null)throw new Error('Sin conexión')
      return rows.slice(0,500)
    }
    await expect(readAccountPages(getPage)).rejects.toThrow('Sin conexión')
  })
  it('una cuenta vacía es una lectura completa',async()=>{
    await expect(readAccountPages(async()=>[])).resolves.toEqual([])
  })
})
