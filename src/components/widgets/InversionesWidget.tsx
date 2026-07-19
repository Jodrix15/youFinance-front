import { Doughnut } from 'react-chartjs-2'
import { useInversiones } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

export default function InversionesWidget() {
  const { theme } = useTheme()
  const { data, isLoading, isError } = useInversiones()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  if (!data || data.length === 0) return <WidgetEmpty message="Sin inversiones registradas." />

  const t = chartTheme()
  const chart = {
    labels: data.map((i) => i.categoriaNombre ?? `Inversión ${i.id}`),
    datasets: [
      {
        data: data.map((i) => Number(i.capitalTotal || 0)),
        backgroundColor: data.map((_, idx) => PALETTE[idx % PALETTE.length]),
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
            tooltip: { callbacks: { label: (c) => ` ${c.label}: ${formatEur(c.parsed)}` } },
          },
        }}
      />
    </div>
  )
}
