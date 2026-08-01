import { useState } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { Line } from 'react-chartjs-2'
import { usePatrimonioHistorico } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme, crosshairPlugin, hoverIndex, puntoHover, tooltipTheme } from '@/lib/chartSetup'
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

  // (Los snapshots vienen ordenados por mes asc, con mes = 'YYYY-MM-DD'.)
  const now = new Date()
  const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  const mesDe = (iso: string) =>
    new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, 1)
  const snapMap = new Map(snaps.map((s) => [s.mes.slice(0, 7), s]))
  const end = new Date(now.getFullYear(), now.getMonth(), 1)
  let start: Date
  if (range === 'YTD') start = new Date(now.getFullYear(), 0, 1)
  else if (range === '1A') start = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  else if (range === '5A') start = new Date(now.getFullYear(), now.getMonth() - 59, 1)
  else {
    // Máx: desde el primer snapshot registrado hasta hoy.
    start = snaps[0] ? mesDe(snaps[0].mes) : end
  }

  const filtered: typeof snaps = []
  let ultimo: (typeof snaps)[number] | null = null
  const cur = new Date(start)
  while (cur <= end) {
    const k = monthKey(cur)
    const found = snapMap.get(k)
    if (found) ultimo = found
    // El patrimonio es un saldo, no un flujo: un mes sin foto no vale cero,
    // vale lo mismo que el último mes conocido. Si se rellenara con ceros la
    // curva caería a plomo cada vez que empieza un mes nuevo.
    // Antes del primer snapshot no hay nada que arrastrar, así que esos meses
    // siguen yendo a cero.
    filtered.push(
      ultimo
        ? { ...ultimo, mes: `${k}-01` }
        : { mes: `${k}-01`, patrimonioNeto: 0, cuentas: 0, inversiones: 0, deudas: 0 },
    )
    cur.setMonth(cur.getMonth() + 1)
  }

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
  const hover = puntoHover()
  // Interpolación monótona en vez de `tension`: la curva de Bézier suavizada se
  // pasa de largo entre dos puntos, así que en una serie con un escalón seguido
  // de un tramo plano dibuja una joroba por encima del valor real y luego baja.
  // Se veía como si el patrimonio cayera cuando en realidad se mantenía. Con
  // 'monotone' la curva nunca sale del rango de los puntos que une, y la altura
  // de la línea siempre coincide con la cifra del tooltip.
  const curva = { cubicInterpolationMode: 'monotone' as const }
  const data = {
    labels,
    datasets: [
      {
        label: 'Patrimonio',
        data: filtered.map((s) => s.patrimonioNeto),
        borderColor: '#2f81f7',
        backgroundColor: 'rgba(47, 129, 247, 0.12)',
        fill: true,
        ...curva,
        pointRadius: puntos,
        pointBackgroundColor: '#2f81f7',
        borderWidth: 2,
        ...hover,
      },
      {
        label: 'Inversiones',
        data: filtered.map((s) => s.inversiones),
        borderColor: '#1d9e75',
        backgroundColor: '#1d9e75',
        fill: false,
        ...curva,
        pointRadius: puntos,
        pointBackgroundColor: '#1d9e75',
        borderWidth: 2,
        ...hover,
      },
      {
        label: 'Ahorros',
        data: filtered.map((s) => s.cuentas),
        borderColor: '#d29922',
        backgroundColor: '#d29922',
        fill: false,
        ...curva,
        pointRadius: puntos,
        pointBackgroundColor: '#d29922',
        borderWidth: 2,
        ...hover,
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
          plugins={[crosshairPlugin]}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            // Sin animación: el punto/curva aparece ya en su sitio, sin el
            // pequeño movimiento de entrada al abrir la sección.
            animation: false,
            // El hover engancha la columna entera y marca el punto de cada serie.
            interaction: hoverIndex,
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
                ...tooltipTheme(),
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
                  callback: (v) => formatEur(Number(v), false),
                },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
