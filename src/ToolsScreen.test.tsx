// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import ToolsScreen from './ToolsScreen'

function Tools() {
  const [tool, setTool] = useState('')
  return <ToolsScreen tool={tool} setTool={setTool} notify={vi.fn()}/>
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

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
