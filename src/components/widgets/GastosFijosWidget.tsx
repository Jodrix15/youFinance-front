import { useDeudas, useRecurrentes } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'
import type { DeudaResponse, GastoRecurrenteResponse } from '@/types/api'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

// Coste mensual de la cuota real de una deuda (anual → /12).
function mensualDeuda(d: DeudaResponse): number {
  const c = Number(d.cuota || 0)
  return d.frecuencia === 'ANUAL' ? c / 12 : c
}

function mensual(g: GastoRecurrenteResponse): number {
  const imp = Number(g.importeActual || 0)
  return g.frecuencia === 'ANUAL' ? imp / 12 : imp
}

export default function GastosFijosWidget() {
  const rec = useRecurrentes()
  const deu = useDeudas()

  if (rec.isLoading || deu.isLoading) return <WidgetLoading />
  if (rec.isError || deu.isError) return <WidgetError />

  const activos = (rec.data ?? []).filter((r) => r.active)
  const suscripciones = sum(
    activos.filter((r) => r.tipoPago === 'SUSCRIPCION').map(mensual),
  )
  const recMensuales = sum(
    activos
      .filter((r) => r.tipoPago === 'RECURRENTE' && r.frecuencia === 'MENSUAL')
      .map((r) => Number(r.importeActual || 0)),
  )
  const cuotasDeuda = sum((deu.data ?? []).map(mensualDeuda))
  const total = suscripciones + recMensuales + cuotasDeuda

  const rows: [string, number][] = [
    ['Suscripciones', suscripciones],
    ['Recurrentes mensuales', recMensuales],
    ['Cuotas de deuda', cuotasDeuda],
  ]

  return (
    <div>
      {rows.map(([label, val]) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            fontSize: 13,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--tx2)' }}>{label}</span>
          <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{formatEur(val, true)}</span>
        </div>
      ))}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          marginTop: 2,
          fontSize: 14,
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--tx1)' }}>Total fijo/mes</span>
        <span style={{ fontWeight: 700, color: 'var(--tx1)' }}>{formatEur(total, true)}</span>
      </div>
    </div>
  )
}
