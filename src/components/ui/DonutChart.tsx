import type { TooltipItem } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'

/**
 * Doughnut reutilizable con la config común de la app (cutout, tema, leyenda
 * abajo). Por defecto el tooltip muestra el valor en euros; se puede
 * sobrescribir con `tooltipLabel`. `legend=false` para gráficos con lista aparte.
 */
export function DonutChart({
  labels,
  values,
  colors,
  legend = true,
  tooltipLabel,
}: {
  labels: string[]
  values: number[]
  colors: string[]
  legend?: boolean
  tooltipLabel?: (ctx: TooltipItem<'doughnut'>) => string
}) {
  const { theme } = useTheme()
  const t = chartTheme()

  return (
    <Doughnut
      key={theme}
      data={{
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderColor: t.border,
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: legend
            ? { position: 'bottom', labels: { color: t.tick, boxWidth: 12, font: { size: 11 } } }
            : { display: false },
          tooltip: {
            callbacks: {
              label: tooltipLabel ?? ((c) => ` ${c.label}: ${formatEur(Number(c.parsed))}`),
            },
          },
        },
      }}
    />
  )
}
