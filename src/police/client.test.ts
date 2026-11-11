import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Item } from './model'
import { saveItem } from './client'

const database = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('../lib/account', () => ({ supabase: database }))

// A stale update matches no row. Supabase then supplies the record already saved.
function simulateStaleUpdate(stored: Item) {
  const query = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: stored, error: null }),
  }
  database.from.mockReturnValue(query)
}

const task: Item = {
  id: 'fixture-agenda', kind: 'plan', day: '2026-11-12', version: 1,
  payload: { title: 'Repasar', minutes: 15, category: 'Repaso', state: 'pending', note: '' },
}

describe('Reprogramación de tareas desde dos dispositivos', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('devuelve un conflicto si otro dispositivo guardó una fecha distinta', async () => {
    simulateStaleUpdate({ ...task, day: '2026-11-13', version: 2 })
    await expect(saveItem(task, 'test-user', true)).rejects.toThrow('otro dispositivo')
  })

  it('reconoce un reintento cuando ya se guardó exactamente la misma tarea', async () => {
    simulateStaleUpdate({ ...task, version: 2 })
    await expect(saveItem(task, 'test-user', true)).resolves.toBeUndefined()
  })
})
