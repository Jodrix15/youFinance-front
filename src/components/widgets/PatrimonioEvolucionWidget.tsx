import { useState } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { usePatrimonioHistorico } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { Tabs } from '@/components/ui/Tabs'
import { WidgetError, WidgetLoading } from './WidgetState'

const pad = (n: number) => String(n).padStart(2, '0')

type Range = 'YTD' | '1A' | '5A' | 'MAX'
const RANGES: [Range, string][] = [
  ['YTD', 'YTD'],
  ['1A', '1 año'],
  ['5A', '5 años'],
  ['MAX', 'Máx'],
]

export default function PatrimonioEvolucionWidget() {
  const { theme } = useTheme()
  const [range, setRange] = useState<Range>('1A')
  const hist = usePatrimonioHistorico()

  if (hist.isLoading) return <WidgetLoading />
  if (hist.isError) return <WidgetError />

  const snaps = hist.data ?? []

  // Fecha de corte según el rango (los snapshots vienen ordenados por mes asc,
  // con mes = 'YYYY-MM-DD' del primer día). Comparamos como cadenas ISO.
  const now = new Date()
  const monthsAgo = (n: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - n, 1)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
  }
  let cutoff: string | null
  if (range === 'YTD') cutoff = `${now.getFullYear()}-01-01`
  else if (range === '1A') cutoff = monthsAgo(11)
  else if (range === '5A') cutoff = monthsAgo(59)
  else cutoff = null

  const filtered = snaps.filter((s) => !cutoff || s.mes >= cutoff)

  const rangeButtons = (
    <div style={{ marginBottom: 8, flexShrink: 0 }}>
      <Tabs
        options={RANGES.map(([value, label]) => ({ value, label }))}
        value={range}
        onChange={setRange}
      />
    </div>
  )

  if (filtered.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {rangeButtons}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: 'var(--tx3)',
            fontSize: 13,
            padding: '0 12px',
          }}
        >
          Aún no hay histórico de patrimonio. Se registra una foto cada mes; la
          curva se irá construyendo con el tiempo.
        </div>
      </div>
    )
  }

  const labels = filtered.map((s) => `${s.mes.slice(5, 7)}/${s.mes.slice(2, 4)}`)
  const puntos = filtered.length <= 2 ? 4 : 0

  const t = chartTheme()
  const data = {
    labels,
    datasets: [
      {
        label: 'Patrimonio',
        data: filtered.map((s) => s.patrimonioNeto),
        borderColor: '#2f81f7',
        backgroundColor: 'rgba(47, 129, 247, 0.12)',
        fill: true,
        tension: 0.25,
        pointRadius: puntos,
        pointBackgroundColor: '#2f81f7',
        borderWidth: 2,
      },
      {
        label: 'Inversiones',
        data: filtered.map((s) => s.inversiones),
        borderColor: '#1d9e75',
        backgroundColor: '#1d9e75',
        fill: false,
        tension: 0.25,
        pointRadius: puntos,
        pointBackgroundColor: '#1d9e75',
        borderWidth: 2,
      },
      {
        label: 'Ahorros',
        data: filtered.map((s) => s.cuentas),
        borderColor: '#d29922',
        backgroundColor: '#d29922',
        fill: false,
        tension: 0.25,
        pointRadius: puntos,
        pointBackgroundColor: '#d29922',
        borderWidth: 2,
      },
    ],
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {rangeButtons}
      <div style={{ flex: 1, minHeight: 0 }}>
        <Line
          key={`${theme}-${range}`}
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            // Sin animación: el punto/curva aparece ya en su sitio, sin el
            // pequeño movimiento de entrada al abrir la sección.
            animation: false,
            plugins: {
              legend: {
                display: true,
                position: 'bottom',
                labels: {
                  color: t.tick,
                  boxWidth: 12,
                  font: { size: 11 },
                  // Recuadro sólido: usa el color de línea también como relleno,
                  // para que Patrimonio no se vea bicolor por su área translúcida.
                  generateLabels: (chart) => {
                    const items = ChartJS.defaults.plugins.legend.labels.generateLabels(chart)
                    items.forEach((it) => {
                      it.fillStyle = it.strokeStyle as string
                    })
                    return items
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label: (c) => ` ${c.dataset.label}: ${formatEur(Number(c.parsed.y))}`,
                },
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: t.tick, font: { size: 10 }, maxTicksLimit: 8 },
              },
              y: {
                grid: { color: t.grid },
                ticks: {
                  color: t.tick,
                  font: { size: 10 },
                  callback: (v) => formatEur(Number(v)),
                },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
