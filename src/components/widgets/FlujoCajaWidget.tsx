import { useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useFlujoCaja } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function FlujoCajaWidget() {
  const { theme } = useTheme()
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  // Agregado por mes calculado en el backend.
  const { data: flujo, isLoading, isError } = useFlujoCaja(anio)

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const meses = flujo ?? []
  const ingresos = meses.map((m) => Number(m.ingresos || 0))
  const gastos = meses.map((m) => Number(m.gastos || 0))
  const totalIngresos = sum(ingresos)
  const totalGastos = sum(gastos)
  const neto = totalIngresos - totalGastos

  const t = chartTheme()
  const data = {
    labels: MESES,
    datasets: [
      { label: 'Ingresos', data: ingresos, backgroundColor: '#1d9e75', borderRadius: 3 },
      { label: 'Gastos', data: gastos, backgroundColor: '#f85149', borderRadius: 3 },
    ],
  }

  const navBtn: React.CSSProperties = {
    background: 'var(--bg3)',
    color: 'var(--tx1)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    width: 24,
    height: 24,
    lineHeight: '22px',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <button type="button" style={navBtn} onClick={() => setAnio((a) => a - 1)}
          aria-label="Año anterior">‹</button>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{anio}</span>
        <button type="button" style={navBtn} onClick={() => setAnio((a) => a + 1)}
          aria-label="Año siguiente">›</button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Bar
          key={`${theme}-${anio}`}
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: {
              legend: { position: 'bottom', labels: { color: t.tick, boxWidth: 12, font: { size: 11 } } },
              tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${formatEur(Number(c.parsed.y))}` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: t.tick, font: { size: 10 } } },
              y: {
                grid: { color: t.grid },
                ticks: { color: t.tick, font: { size: 10 }, callback: (v) => formatEur(Number(v), false) },
              },
            },
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: 11,
          color: 'var(--tx2)',
          flexShrink: 0,
        }}
      >
        <span>Ingresos <strong style={{ color: 'var(--up)' }}>{formatEur(totalIngresos, true)}</strong></span>
        <span>Gastos <strong style={{ color: 'var(--down)' }}>{formatEur(totalGastos, true)}</strong></span>
        <span>
          Neto{' '}
          <strong style={{ color: neto >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {formatEur(neto, true)}
          </strong>
        </span>
      </div>
    </div>
  )
}
