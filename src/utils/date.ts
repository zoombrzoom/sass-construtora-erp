import { Timestamp } from 'firebase/firestore'

export function toDate(date: Date | Timestamp): Date {
  return date instanceof Date ? date : date.toDate()
}

/** Formata data ISO (YYYY-MM-DD) para exibição brasileira DD/MM/YYYY */
export function formatIsoToBr(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  if (!y || !m || !d) return iso
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

/** Parse de string DD/MM/YYYY ou D/M/YYYY para ISO YYYY-MM-DD. Retorna '' se inválido. */
export function parseBrToIso(br: string): string {
  const cleaned = br.trim().replace(/[^\d]/g, ' ')
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length < 3) return ''
  const d = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const y = parseInt(parts[2], 10)
  if (Number.isNaN(d) || Number.isNaN(m) || Number.isNaN(y)) return ''
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) return ''
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return ''
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}
