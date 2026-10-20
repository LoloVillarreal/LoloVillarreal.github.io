import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { currentTheme, themes } from './appearance'
import { defaultSettings, validateBackup } from './db'

describe('apariencia y compatibilidad',()=>{
  it('recupera temas antiguos y da prioridad al tema explícito',()=>{
    expect(currentTheme({darkMode:false})).toBe('light')
    expect(currentTheme({darkMode:true})).toBe('dark')
    expect(currentTheme({darkMode:true,theme:'glass'})).toBe('glass')
    expect(themes.map(theme=>theme.id)).toEqual(['light','dark','glass'])
  })
  it('acepta copias antiguas y nuevas y rechaza apariencias desconocidas',()=>{
    const copy={schemaVersion:2,exportedAt:new Date().toISOString(),workoutLogs:[],cardioLogs:[],progressLogs:[],mealChecks:{},settings:defaultSettings,localState:{}}
    expect(validateBackup(copy)).toBe(true)
    expect(validateBackup({...copy,settings:{...defaultSettings,theme:'glass'}})).toBe(true)
    expect(validateBackup({...copy,settings:{...defaultSettings,theme:'unknown'}})).toBe(false)
  })
})
