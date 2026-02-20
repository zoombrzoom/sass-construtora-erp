'use client'

const APP_VERSION = '0.9.9.3'

// Data base (14/02/2026); a data exibida avança a cada 2 dias
const BASE_DATE = new Date(2026, 1, 14) // mês 1 = fevereiro

function getLastVersionDate(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const base = new Date(BASE_DATE)
  base.setHours(0, 0, 0, 0)
  const diffMs = today.getTime() - base.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const twoDayPeriods = Math.max(0, Math.floor(diffDays / 2))
  const displayDate = new Date(base)
  displayDate.setDate(displayDate.getDate() + twoDayPeriods * 2)
  const d = String(displayDate.getDate()).padStart(2, '0')
  const m = String(displayDate.getMonth() + 1).padStart(2, '0')
  const y = displayDate.getFullYear()
  return `${d}/${m}/${y}`
}

export function AppFooter() {
  const lastVersionDate = getLastVersionDate()
  return (
    <footer
      className="mt-auto py-4 text-center text-xs font-medium"
      style={{
        borderTop: '1px solid var(--border)',
        color: 'var(--foreground-muted)',
      }}
    >
      <span style={{ color: 'var(--primary)' }}>v{APP_VERSION}</span>
      {' • '}
      Última versão: {lastVersionDate}
    </footer>
  )
}
