import { useGastosCategoria } from '@/hooks/useFinance'
import { PALETTE } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { DonutChart } from '@/components/ui/DonutChart'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function GastosCategoriaWidget() {
  // Agregado por categoría calculado en el backend (ya viene ordenado desc).
  const { data, isLoading, isError } = useGastosCategoria()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const total = sum((data ?? []).map((d) => Number(d.total || 0)))
  const items = (data ?? []).map((d, idx) => ({
    name: d.categoria ?? 'Otros',
    amount: Number(d.total || 0),
    pct: total ? Math.round((Number(d.total || 0) / total) * 100) : 0,
    color: PALETTE[idx % PALETTE.length],
  }))

  if (items.length === 0) return <WidgetEmpty message="Sin gastos registrados." />

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 150, flexShrink: 0 }}>
        <DonutChart
          legend={false}
          labels={items.map((i) => i.name)}
          values={items.map((i) => i.amount)}
          colors={items.map((i) => i.color)}
          tooltipLabel={(c) => {
            const pct = total ? Math.round((Number(c.parsed) / total) * 100) : 0
            return ` ${c.label}: ${formatEur(Number(c.parsed))} · ${pct}%`
          }}
        />
      </div>
      <div style={{ marginTop: 10, overflow: 'auto' }}>
        {items.map((i) => (
          <div
            key={i.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: i.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: 'var(--tx1)' }}>{i.name}</span>
            <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{formatEur(i.amount)}</span>
            <span style={{ color: 'var(--tx2)', width: 38, textAlign: 'right' }}>{i.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
