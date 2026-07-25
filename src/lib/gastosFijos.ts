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

// Nota: la vista "gasto fijo real de un mes concreto" (con anuales en su mes)
// se calcula ahora en el backend: GET /api/dashboard/gastos-fijos?anio&mes.
