import { Doughnut } from 'react-chartjs-2'
import { useMovimientos } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function GastosCategoriaWidget() {
  const { theme } = useTheme()
  const { data: movs, isLoading, isError } = useMovimientos()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const map = new Map<string, number>()
  ;(movs ?? [])
    .filter((m) => m.tipoMovimiento === 'GASTO')
    .forEach((m) => {
      const cat = m.categoriaNombre ?? 'Otros'
      map.set(cat, (map.get(cat) ?? 0) + Math.abs(Number(m.importe || 0)))
    })

  const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return <WidgetEmpty message="Sin gastos registrados." />

  const total = sum(entries.map((e) => e[1]))
  const items = entries.map(([name, amount], idx) => ({
    name,
    amount,
    pct: total ? Math.round((amount / total) * 100) : 0,
    color: PALETTE[idx % PALETTE.length],
  }))

  const t = chartTheme()
  const data = {
    labels: items.map((i) => i.name),
    datasets: [
      {
        data: items.map((i) => i.amount),
        backgroundColor: items.map((i) => i.color),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 150, flexShrink: 0 }}>
        <Doughnut
          key={theme}
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (c) => {
                    const pct = total ? Math.round((Number(c.parsed) / total) * 100) : 0
                    return ` ${c.label}: ${formatEur(c.parsed)} · ${pct}%`
                  },
                },
              },
            },
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
