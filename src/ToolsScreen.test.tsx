// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ToolsScreen from './ToolsScreen'
import BarbellCalculator, { initialBarSetup } from './BarbellCalculator'
import { StorageProvider } from './lib/storage'

function Tools() {
  const [tool, setTool] = useState('')
  const [setup,setSetup]=useState(initialBarSetup)
  return <ToolsScreen tool={tool} setTool={setTool} notify={vi.fn()} barCalculator={<BarbellCalculator setup={setup} setSetup={setSetup}/>}/>
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers() })

it('inicia el descanso desde el índice y estrena el tiempo elegido cuando se vuelve a abrir', () => {
  vi.useFakeTimers()
  render(<Tools/>)
  fireEvent.click(screen.getByRole('button',{name:/Descansos.*Iniciar descanso/}))
  act(()=>vi.advanceTimersByTime(10000))
  expect(screen.getByRole('timer').textContent).toBe('1:20')
  fireEvent.click(screen.getByRole('button',{name:'45 s'}))
  expect(screen.getByRole('button',{name:'Empezar descanso'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Todas las herramientas'}))
  fireEvent.click(screen.getByRole('button',{name:/0:45.*Descansos/}))
  act(()=>vi.advanceTimersByTime(1000))
  expect(screen.getByRole('timer').textContent).toBe('0:44')
})

it('mantiene las ideas de comida como guía opcional y vuelve al tipo de comida elegido', async () => {
  render(<StorageProvider><Tools/></StorageProvider>)
  fireEvent.click(await screen.findByText('Guías de entrenamiento y comida'))
  fireEvent.click(screen.getByRole('button',{name:/Ideas para comer/}))
  fireEvent.click(screen.getByRole('button',{name:'Cenas'}))
  const dinner=screen.getByText('Salmón, patata y verdura').closest('details')!
  fireEvent.click(dinner.querySelector('summary')!)
  expect(dinner.open).toBe(true)
  expect(within(dinner).getByRole('heading',{name:'Alternativas'})).toBeTruthy()
  fireEvent.click(screen.getByText('Menú semanal de referencia'))
  expect(within(screen.getByLabelText('Día del menú')).getAllByRole('option')).toHaveLength(7)
  fireEvent.click(screen.getByRole('button',{name:'Todas las herramientas'}))
  fireEvent.click(screen.getByRole('button',{name:/Ideas para comer/}))
  expect(screen.getByRole('button',{name:'Cenas'}).getAttribute('aria-pressed')).toBe('true')
})

it('cambia el sentido de conversión y devuelve el foco a la herramienta al salir', () => {
  render(<Tools/>)
  fireEvent.click(screen.getByRole('button', {name:/Conversor kg/}))
  expect(document.activeElement).toBe(screen.getByRole('heading', {name:'Conversor kg / lb'}))
  fireEvent.change(screen.getByLabelText('Peso (kg)'), {target:{value:'100'}})
  expect(screen.getByRole('status').textContent).toBe('220,46 lb')
  fireEvent.click(screen.getByRole('button', {name:'De lb a kg'}))
  expect(screen.getByLabelText('Peso (lb)')).toBeTruthy()
  expect(screen.getByRole('status').textContent).toBe('45,36 kg')
  fireEvent.click(screen.getByRole('button', {name:'Todas las herramientas'}))
  expect(document.activeElement).toBe(screen.getByRole('button', {name:/Conversor kg/}))
})

it('suma y quita pares conservando el montaje al cambiar de barra o visitar otra herramienta',()=>{
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'))}
  render(<Tools/>)
  fireEvent.click(screen.getByRole('button',{name:/Barra y discos/}))
  const total=()=>screen.getByLabelText('Peso total').textContent
  expect(total()).toBe('20 kg')
  fireEvent.click(screen.getByRole('button',{name:'Añadir dos discos de 10 kg'}))
  fireEvent.click(screen.getByRole('button',{name:'Añadir dos discos de 1,25 kg'}))
  expect(total()).toBe('42,5 kg')
  fireEvent.click(screen.getByRole('button',{name:/Elegir barra/}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:/Curva Z/}))
  expect(total()).toBe('34,5 kg')
  fireEvent.click(screen.getByRole('button',{name:'Todas las herramientas'}))
  fireEvent.click(screen.getByRole('button',{name:/Conversor kg/}))
  fireEvent.click(screen.getByRole('button',{name:'Todas las herramientas'}))
  fireEvent.click(screen.getByRole('button',{name:/Barra y discos/}))
  fireEvent.click(screen.getByRole('button',{name:'Quitar dos discos de 1,25 kg'}))
  expect(total()).toBe('32 kg')
  expect(screen.queryByRole('button',{name:'Quitar dos discos de 1,25 kg'})).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Añadir dos discos de 1,25 kg'}))
})

it('monta los discos al escribir el objetivo o completar el peso de la Smith, y permite ajustarlos a mano',()=>{
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
  render(<Tools/>)
  fireEvent.click(screen.getByRole('button',{name:/Barra y discos/}))
  fireEvent.click(screen.getByRole('button',{name:/Elegir barra/}))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:/Multipower/}))
  expect(screen.getByLabelText('Peso total').textContent).toBe('— kg')
  const field=screen.getByRole('textbox',{name:'Peso objetivo total con barra (kg)'})
  fireEvent.change(field,{target:{value:'30,5'}})
  fireEvent.change(screen.getByLabelText('Peso de la barra (kg)'),{target:{value:'7,5'}})
  expect(screen.getByText('≈ 30 kg')).toBeTruthy()
  expect(screen.getByLabelText('Peso total').textContent).toBe('30 kg')
  fireEvent.change(field,{target:{value:'47,5'}})
  expect(screen.getByLabelText('Peso total').textContent).toBe('47,5 kg')
  fireEvent.click(screen.getByRole('button',{name:'Quitar dos discos de 20 kg'}))
  expect((field as HTMLInputElement).value).toBe('')
  expect(screen.getByLabelText('Peso total').textContent).toBe('7,5 kg')
})

it('abre una ficha pulsando su nombre y mantiene la búsqueda al volver', () => {
  HTMLDialogElement.prototype.showModal = function() {this.setAttribute('open','')}
  HTMLDialogElement.prototype.close = function() {this.removeAttribute('open')}
  render(<Tools/>)
  fireEvent.click(screen.getByRole('button', {name:/Biblioteca de ejercicios/}))
  fireEvent.click(screen.getByRole('button', {name:'Glúteos'}))
  const entry = screen.getAllByRole('button', {name:/Ver foto y técnica de/})[0]
  fireEvent.click(within(entry).getByText(entry.querySelector('strong')!.textContent!))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name:'Cerrar ficha'}))
  expect(document.activeElement).toBe(entry)
  expect((screen.getByLabelText('Buscar ejercicio') as HTMLInputElement).value).toBe('Glúteos')
  fireEvent.change(screen.getByLabelText('Buscar ejercicio'), {target:{value:'zzzzzzz'}})
  expect(screen.getByRole('status').textContent).toMatch(/No encontramos/)
  fireEvent.click(screen.getByRole('button', {name:'Borrar búsqueda'}))
  expect(document.activeElement).toBe(screen.getByLabelText('Buscar ejercicio'))
  expect(screen.getAllByRole('button', {name:/Ver foto y técnica de/})).toHaveLength(30)
})
