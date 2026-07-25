import { useMemo } from 'react'
import { useMovimientos } from '@/hooks/useFinance'
import { PALETTE } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { DonutChart } from '@/components/ui/DonutChart'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function GastosCategoriaWidget() {
  const { data: movs, isLoading, isError } = useMovimientos()

  const items = useMemo(() => {
    const map = new Map<string, number>()
    ;(movs ?? [])
      .filter((m) => m.tipoMovimiento === 'GASTO')
      .forEach((m) => {
        const cat = m.categoriaNombre ?? 'Otros'
        map.set(cat, (map.get(cat) ?? 0) + Math.abs(Number(m.importe || 0)))
      })
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
    const total = sum(entries.map((e) => e[1]))
    return entries.map(([name, amount], idx) => ({
      name,
      amount,
      pct: total ? Math.round((amount / total) * 100) : 0,
      color: PALETTE[idx % PALETTE.length],
    }))
  }, [movs])

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  if (items.length === 0) return <WidgetEmpty message="Sin gastos registrados." />

  const total = sum(items.map((i) => i.amount))

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
