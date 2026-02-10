export function sanitizeCurrencyInput(value: string): string {
  const cleaned = value.replace(/[^\d.,]/g, '')
  if (!cleaned) return ''

  const commaIndex = cleaned.indexOf(',')
  const hasComma = commaIndex >= 0

  const integerPartRaw = hasComma ? cleaned.slice(0, commaIndex) : cleaned
  const integerPart = integerPartRaw
    .replace(/[^\d.]/g, '')
    .replace(/^\./, '')
    .replace(/\.{2,}/g, '.')

  if (!hasComma) {
    return integerPart
  }

  const decimalPart = cleaned
    .slice(commaIndex + 1)
    .replace(/[^\d]/g, '')
    .slice(0, 2)

  return `${integerPart},${decimalPart}`
}

export function parseCurrencyInput(value: string): number {
  if (!value) return 0

  const cleaned = value.trim()
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, '')
      : cleaned

  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrencyInput(value: number | string): string {
  const parsed = typeof value === 'number' ? value : parseCurrencyInput(value)
  const [intPart, decPart] = parsed.toFixed(2).split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedInt},${decPart}`
}
