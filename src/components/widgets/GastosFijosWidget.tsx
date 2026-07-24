import { useDeudas, useRecurrentes } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { calcularGastosFijos } from '@/lib/gastosFijos'
import { WidgetError, WidgetLoading } from './WidgetState'

export default function GastosFijosWidget() {
  const rec = useRecurrentes()
  const deu = useDeudas()

  if (rec.isLoading || deu.isLoading) return <WidgetLoading />
  if (rec.isError || deu.isError) return <WidgetError />

  const { suscripciones, recurrentesMensuales, cuotasDeuda, total } =
    calcularGastosFijos(rec.data, deu.data)

  const rows: [string, number][] = [
    ['Suscripciones', suscripciones],
    ['Recurrentes mensuales', recurrentesMensuales],
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
