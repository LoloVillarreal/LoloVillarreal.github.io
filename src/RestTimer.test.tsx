// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RestTimer } from './RestTimer'

afterEach(()=>{cleanup();vi.useRealTimers()})
describe('descanso en la guía',()=>{
  it('permite pausa, continuación y reinicio sin contar el tiempo pausado',()=>{
    vi.useFakeTimers();render(<RestTimer seconds={65}/>)
    fireEvent.click(screen.getByRole('button',{name:'Empezar descanso'}))
    act(()=>vi.advanceTimersByTime(35000));expect(screen.getByRole('timer').textContent).toBe('0:30')
    fireEvent.click(screen.getByRole('button',{name:'Pausar descanso'}))
    act(()=>vi.advanceTimersByTime(60000));expect(screen.getByRole('timer').textContent).toBe('0:30')
    fireEvent.click(screen.getByRole('button',{name:'Continuar descanso'}))
    act(()=>vi.advanceTimersByTime(30000));expect(screen.getByRole('timer').textContent).toBe('0:00')
    expect(screen.getByText('Descanso terminado')).toBeTruthy()
    fireEvent.click(screen.getByRole('button',{name:'Reiniciar descanso'}));expect(screen.getByRole('timer').textContent).toBe('1:05')
  })
  it('recupera el tiempo real al reanudar una pestaña suspendida',()=>{
    vi.useFakeTimers();render(<RestTimer seconds={90}/>)
    fireEvent.click(screen.getByRole('button',{name:'Empezar descanso'}))
    act(()=>{vi.setSystemTime(Date.now()+120000);vi.advanceTimersByTime(250)})
    expect(screen.getByRole('timer').textContent).toBe('0:00')
    expect(screen.getByText('Descanso terminado')).toBeTruthy()
  })
})
