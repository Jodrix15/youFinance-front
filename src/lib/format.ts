const eur = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const eurCents = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const pct = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatEur(value: number | null | undefined, cents = false): string {
  if (value == null || Number.isNaN(value)) return '—'
  return cents ? eurCents.format(value) : eur.format(value)
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return pct.format(value / 100)
}
