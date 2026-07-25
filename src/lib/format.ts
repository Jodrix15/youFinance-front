import type { Moneda } from '@/types/api'

/**
 * Moneda activa de la aplicación. La fija <App> a partir de la preferencia del
 * usuario (ver AuthContext). Al cambiarla en Ajustes, toda la app vuelve a
 * renderizar y los importes se formatean con el símbolo elegido.
 */
let activeCurrency: Moneda = 'EUR'

export const CURRENCY_SYMBOLS: Record<Moneda, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

// Cacheamos los formateadores por moneda para no recrearlos en cada render.
const wholeCache = new Map<Moneda, Intl.NumberFormat>()
const centsCache = new Map<Moneda, Intl.NumberFormat>()

function whole(currency: Moneda): Intl.NumberFormat {
  let f = wholeCache.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    })
    wholeCache.set(currency, f)
  }
  return f
}

function cents(currency: Moneda): Intl.NumberFormat {
  let f = centsCache.get(currency)
  if (!f) {
    f = new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    centsCache.set(currency, f)
  }
  return f
}

const pct = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** Fija la moneda con la que se formatean los importes en toda la app. */
export function setActiveCurrency(currency: Moneda) {
  activeCurrency = currency
}

/** Moneda activa actual. */
export function getActiveCurrency(): Moneda {
  return activeCurrency
}

/** Símbolo (€, $, £) de la moneda activa, para etiquetas y prefijos. */
export function currencySymbol(): string {
  return CURRENCY_SYMBOLS[activeCurrency]
}

/**
 * Formatea un importe con la moneda activa del usuario. Mantiene el nombre
 * histórico `formatEur` para no tocar los ~80 puntos de uso; ya no está atado
 * al euro.
 */
export function formatEur(value: number | null | undefined, withCents = false): string {
  if (value == null || Number.isNaN(value)) return '—'
  return withCents ? cents(activeCurrency).format(value) : whole(activeCurrency).format(value)
}

/** Alias semántico de `formatEur`. */
export const formatMoney = formatEur

export function formatPct(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return pct.format(value / 100)
}
