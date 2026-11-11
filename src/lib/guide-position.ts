import { useMemo, useState } from 'react'
import { validDate } from './dates'

export type GuidePosition = { date: string; index: number }
type Bookmark = GuidePosition & { open: boolean }

function readBookmark(owner?: string): Bookmark | null {
  if (!owner) return null
  try {
    const saved = JSON.parse(localStorage.getItem('la-guide:' + owner) || 'null')
    return saved && validDate(saved.date) && Number.isInteger(saved.index) &&
      saved.index >= 0 && saved.index < 30 && typeof saved.open === 'boolean' ? saved : null
  } catch { return null }
}

export function useGuidePosition(owner?: string) {
  const initial = useMemo(() => readBookmark(owner), [owner])
  const [latest, setLatest] = useState<{owner: string; value: Bookmark | null}>()
  const bookmark = latest && latest.owner === owner ? latest.value : initial

  function store(value: Bookmark | null) {
    if (!owner) return
    setLatest({owner, value})
    try {
      if (value) localStorage.setItem('la-guide:' + owner, JSON.stringify(value))
      else localStorage.removeItem('la-guide:' + owner)
    } catch { /* Reading can continue in memory when device storage is unavailable. */ }
  }
  return {
    bookmark,
    reader: bookmark?.open ? bookmark : null,
    setReader(position: GuidePosition | null) {
      store(position ? {...position, open: true} : bookmark ? {...bookmark, open: false} : null)
    },
    finish(date: string) {
      if (bookmark?.date === date) store(null)
    }
  }
}
