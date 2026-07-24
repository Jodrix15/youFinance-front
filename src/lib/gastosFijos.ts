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
 * Gastos fijos mensuales del usuario, con el mismo criterio que el widget del
 * dashboard: suscripciones activas + recurrentes mensuales activos + cuotas de
 * deuda (normalizadas a mensual). Es la cifra que se resta a la cantidad
 * introducida para saber el dinero disponible para presupuestar.
 */
export function calcularGastosFijos(
  recurrentes: GastoRecurrenteResponse[] | undefined,
  deudas: DeudaResponse[] | undefined,
): GastosFijos {
  const activos = (recurrentes ?? []).filter((r) => r.active)
  const suscripciones = sum(
    activos.filter((r) => r.tipoPago === 'SUSCRIPCION').map(mensualRecurrente),
  )
  const recurrentesMensuales = sum(
    activos
      .filter((r) => r.tipoPago === 'RECURRENTE' && r.frecuencia === 'MENSUAL')
      .map((r) => Number(r.importeActual || 0)),
  )
  const cuotasDeuda = sum((deudas ?? []).map(mensualDeuda))
  return {
    suscripciones,
    recurrentesMensuales,
    cuotasDeuda,
    total: suscripciones + recurrentesMensuales + cuotasDeuda,
  }
}
