// @vitest-environment jsdom
import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import BarbellCalculator, { initialBarSetup } from './BarbellCalculator'
import { useGymSettings } from './GymInventory'
import { plateWeights } from './lib/gym-tools'

const account=vi.hoisted(()=>({
  session:{user:{id:'simulado'}},complete:true,values:{} as Record<string,unknown>,confirmedValues:{} as Record<string,unknown>,
  set:vi.fn(),flush:vi.fn(),
}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))

function Calculator() {
  const [setup,setSetup]=useState(initialBarSetup)
  const gym=useGymSettings()
  return <BarbellCalculator setup={setup} setSetup={setSetup} gym={gym}/>
}

it('mantiene el inventario confirmado mientras falla el guardado y aplica los límites al reintentar',async()=>{
  account.set.mockImplementation((key:string,update:(v:unknown)=>unknown)=>{account.values[key]=update(account.values[key])})
  account.flush.mockRejectedValueOnce(Error('Fallo simulado de red')).mockImplementation(async()=>{
    account.confirmedValues={...account.values}
  })
  const view=render(<Calculator/>)
  const btn=(name:string|RegExp)=>screen.getByRole('button',{name})
  fireEvent.change(screen.getByLabelText('Peso objetivo total con barra (kg)'),{target:{value:'82,5'}})
  fireEvent.click(btn(/Mi gimnasio/))
  fireEvent.change(screen.getByLabelText('Pares de 25 kg'),{target:{value:'1'}})
  fireEvent.change(screen.getByLabelText('Pares de 15 kg'),{target:{value:'2'}})
  fireEvent.click(btn('Guardar mi gimnasio'))
  expect((await screen.findByRole('alert')).textContent).toMatch('Fallo simulado')
  expect(screen.getByLabelText('Peso total').textContent).toBe('82,5 kg')
  fireEvent.click(btn('Guardar mi gimnasio'))
  await waitFor(()=>expect(screen.getByText('Material guardado en tu cuenta.')).toBeTruthy())
  view.rerender(<Calculator/>)
  expect(account.set).toHaveBeenCalledTimes(1)
  expect(account.confirmedValues.gymInventory).toMatchObject({pairs:Object.fromEntries(plateWeights.map(w=>[w,w===25?1:w===15?2:0]))})
  expect(screen.getByLabelText('Peso total').textContent).toBe('80 kg')
  expect((btn('Añadir dos discos de 15 kg') as HTMLButtonElement).disabled).toBe(true)
  expect((btn('Añadir dos discos de 1,25 kg') as HTMLButtonElement).disabled).toBe(true)
})
