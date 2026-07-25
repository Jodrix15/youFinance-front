import { Doughnut } from 'react-chartjs-2'
import { useDistribucionPatrimonio } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

export default function PatrimonioWidget() {
  const { theme } = useTheme()
  const { data, isLoading, isError } = useDistribucionPatrimonio()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const items = (data ?? []).filter((d) => Number(d.importe || 0) > 0)
  if (items.length === 0) return <WidgetEmpty />

  const t = chartTheme()
  const chart = {
    labels: items.map((d) => d.concepto),
    datasets: [
      {
        data: items.map((d) => Number(d.importe || 0)),
        backgroundColor: items.map((_, idx) => PALETTE[idx % PALETTE.length]),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <Doughnut
        key={theme}
        data={chart}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: t.tick, boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.label}: ${formatEur(c.parsed)} · ${formatPct(items[c.dataIndex]?.porcentaje ?? null)}`,
              },
            },
          },
        }}
      />
    </div>
  )
}
