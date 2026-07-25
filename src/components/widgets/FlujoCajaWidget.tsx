import { useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { useMovimientos } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function FlujoCajaWidget() {
  const { theme } = useTheme()
  const { data: movs, isLoading, isError } = useMovimientos()
  const [anio, setAnio] = useState(() => new Date().getFullYear())

  // Ingresos y gastos del año seleccionado, agregados por mes.
  const { ingresos, gastos, totalIngresos, totalGastos, neto } = useMemo(() => {
    const ingresos = new Array(12).fill(0)
    const gastos = new Array(12).fill(0)
    ;(movs ?? [])
      .filter((m) => m.fechaTransaccion?.slice(0, 4) === String(anio))
      .forEach((m) => {
        const mes = Number(m.fechaTransaccion.slice(5, 7)) - 1
        if (mes < 0 || mes > 11) return
        const imp = Math.abs(Number(m.importe || 0))
        if (m.tipoMovimiento === 'INGRESO') ingresos[mes] += imp
        else if (m.tipoMovimiento === 'GASTO') gastos[mes] += imp
      })
    const totalIngresos = ingresos.reduce((a, b) => a + b, 0)
    const totalGastos = gastos.reduce((a, b) => a + b, 0)
    return { ingresos, gastos, totalIngresos, totalGastos, neto: totalIngresos - totalGastos }
  }, [movs, anio])

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

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
                ticks: { color: t.tick, font: { size: 10 }, callback: (v) => formatEur(Number(v)) },
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
