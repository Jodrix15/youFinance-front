import type { DeudaResponse, GastoRecurrenteResponse } from '@/types/api'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

/** Coste mensual de la cuota real de una deuda (anual → /12). */
export function mensualDeuda(d: DeudaResponse): number {
  const c = Number(d.cuota || 0)
  return d.frecuencia === 'ANUAL' ? c / 12 : c
}

/** Coste mensual de un gasto recurrente/suscripción (anual → /12). */
export function mensualRecurrente(g: GastoRecurrenteResponse): number {
  const imp = Number(g.importeActual || 0)
  return g.frecuencia === 'ANUAL' ? imp / 12 : imp
}

export interface GastosFijos {
  suscripciones: number
  recurrentesMensuales: number
  cuotasDeuda: number
  total: number
}

/**
 * Gastos fijos prorrateados a mes (anuales ÷12): suscripciones + recurrentes +
 * cuotas de deuda activos. Es la cifra media mensual que usa Presupuestos para
 * calcular el dinero disponible. Incluye los pagos anuales repartidos.
 */
export function calcularGastosFijos(
  recurrentes: GastoRecurrenteResponse[] | undefined,
  deudas: DeudaResponse[] | undefined,
): GastosFijos {
  const activos = (recurrentes ?? []).filter((r) => r.active)
  const suscripciones = sum(
    activos.filter((r) => r.tipoPago === 'SUSCRIPCION').map(mensualRecurrente),
  )
  // Antes solo se sumaban los RECURRENTE mensuales, así que los anuales se
  // perdían. Ahora se prorratean igual que suscripciones y deudas.
  const recurrentesMensuales = sum(
    activos.filter((r) => r.tipoPago === 'RECURRENTE').map(mensualRecurrente),
  )
  const cuotasDeuda = sum((deudas ?? []).map(mensualDeuda))
  return {
    suscripciones,
    recurrentesMensuales,
    cuotasDeuda,
    total: suscripciones + recurrentesMensuales + cuotasDeuda,
  }
}

// ── Vista por meses (gasto fijo real de un mes concreto) ──

/** Año/mes (mes 1-12). */
export interface YearMonth {
  year: number
  month: number
}

function parseYM(iso?: string | null): YearMonth | null {
  if (!iso) return null
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  if (!year || !month) return null
  return { year, month }
}

/** <0 si a va antes que b, 0 si igual, >0 si después. */
function cmpYM(a: YearMonth, b: YearMonth): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month
}

/**
 * Importe que un recurrente/suscripción realmente carga en el mes dado.
 * Los recurrentes no tienen fecha de fin: cargan de forma indefinida desde el
 * primer pago hasta que se desactivan. Mensual → cada mes desde el primer pago;
 * anual → una vez al año, en el mes del primer pago.
 * (fechaUltimoPago es solo el último pago registrado, no el fin de la serie.)
 */
export function importeRecurrenteEnMes(r: GastoRecurrenteResponse, ym: YearMonth): number {
  if (!r.active) return 0
  const imp = Number(r.importeActual || 0)
  if (imp === 0) return 0

  const inicio = parseYM(r.fechaPrimerPago)
  if (inicio && cmpYM(ym, inicio) < 0) return 0

  if (r.frecuencia === 'MENSUAL') return imp

  // Anual: cae una vez al año, en el mes del primer pago (o del próximo pago).
  const ancla = inicio ?? parseYM(r.fechaProximoPago)
  if (!ancla) return 0
  return ym.month === ancla.month ? imp : 0
}

/**
 * Importe que una deuda realmente carga en el mes dado.
 * Mensual → la cuota cada mes hasta el vencimiento; anual → la cuota una vez al
 * año, aproximada al mes de vencimiento (las deudas no tienen fecha de próximo
 * pago, solo de vencimiento).
 */
export function importeDeudaEnMes(d: DeudaResponse, ym: YearMonth): number {
  const c = Number(d.cuota || 0)
  if (c === 0) return 0

  const venc = parseYM(d.fechaVencimiento)
  if (venc && cmpYM(ym, venc) > 0) return 0 // ya terminada

  if (d.frecuencia === 'MENSUAL') return c

  // Anual: sin fecha de próximo pago, se aproxima al mes de vencimiento.
  if (!venc) return 0
  return ym.month === venc.month ? c : 0
}

export interface GastosMes {
  suscripciones: number
  recurrentes: number
  cuotasDeuda: number
  total: number
}

/** Desglose del gasto fijo real que vence en un mes concreto. */
export function gastosFijosDelMes(
  recurrentes: GastoRecurrenteResponse[] | undefined,
  deudas: DeudaResponse[] | undefined,
  ym: YearMonth,
): GastosMes {
  const rec = recurrentes ?? []
  const suscripciones = sum(
    rec.filter((r) => r.tipoPago === 'SUSCRIPCION').map((r) => importeRecurrenteEnMes(r, ym)),
  )
  const recurrentesTotal = sum(
    rec.filter((r) => r.tipoPago === 'RECURRENTE').map((r) => importeRecurrenteEnMes(r, ym)),
  )
  const cuotasDeuda = sum((deudas ?? []).map((d) => importeDeudaEnMes(d, ym)))
  return {
    suscripciones,
    recurrentes: recurrentesTotal,
    cuotasDeuda,
    total: suscripciones + recurrentesTotal + cuotasDeuda,
  }
}
