// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { LoveNote } from './LoveNote'

const account=vi.hoisted(()=>({session:null as null|{user:{id:string}}}))
vi.mock('./lib/account',()=>({useAccount:()=>account}))
afterEach(()=>{cleanup();account.session=null;vi.useRealTimers()})
describe('firma del perfil',()=>{
  it('solo aparece en el perfil elegido',()=>{
    const view=render(<LoveNote/>);expect(screen.queryByRole('button')).toBeNull()
    account.session={user:{id:'another-account'}};view.rerender(<LoveNote/>);expect(screen.queryByRole('button')).toBeNull()
    account.session={user:{id:'b8c904e1-c36e-4c72-a0c1-266394fb8557'}};view.rerender(<LoveNote/>);expect(screen.getByRole('button').textContent).toContain('te amo mucho')
  })
  it('muestra un corazón al tocar la firma y permite repetirlo',()=>{
    account.session={user:{id:'b8c904e1-c36e-4c72-a0c1-266394fb8557'}};render(<LoveNote/>);expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button'));expect(screen.getByRole('status').textContent).toBe('♥')
    fireEvent.click(screen.getByRole('button'));expect(screen.getByRole('status').textContent).toBe('♥')
  })
})
