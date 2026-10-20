import type { AppSettings } from '../types'

export const themes=[{id:'light',label:'Claro'},{id:'dark',label:'Oscuro'},{id:'glass',label:'Liquid Glass'}] as const
export const currentTheme=(settings:Pick<AppSettings,'theme'|'darkMode'>)=>settings.theme??(settings.darkMode?'dark':'light')
