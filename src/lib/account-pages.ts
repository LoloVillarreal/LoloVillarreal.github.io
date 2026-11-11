export type AccountRow = {
  key: string
  value: {data: unknown}
  version: number
  updated_at: string
}

// The server can return fewer rows than requested. Only an empty page ends the read.
export async function readAccountPages(fetchPage: (after: string | null) => Promise<AccountRow[]>) {
  const rows: AccountRow[] = []
  let after: string | null = null
  for (;;) {
    const page = await fetchPage(after)
    if (page.length === 0) return rows
    const lastKey = page[page.length - 1].key
    if (lastKey === after) throw new Error('No se pudo completar la lectura de la cuenta.')
    rows.push(...page)
    after = lastKey
  }
}
