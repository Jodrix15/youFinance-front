import { useMemo } from 'react'
import { useMovimientos } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const anio = new Date().getFullYear() - 1

export default function TopMesesGastoWidget() {
  const { data: movs, isLoading, isError } = useMovimientos()

  // Top 5 meses con más gasto del año anterior.
  const top = useMemo(() => {
    const porMes = new Array(12).fill(0)
    ;(movs ?? [])
      .filter((m) => m.tipoMovimiento === 'GASTO' && m.fechaTransaccion?.slice(0, 4) === String(anio))
      .forEach((m) => {
        const mes = Number(m.fechaTransaccion.slice(5, 7)) - 1
        if (mes >= 0 && mes < 12) porMes[mes] += Math.abs(Number(m.importe || 0))
      })
    return porMes
      .map((total, mes) => ({ mes, total }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [movs])

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  if (top.length === 0)
    return <WidgetEmpty message={`Sin gastos registrados en ${anio}.`} />

  const max = top[0].total

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 10 }}>
        Meses con más gasto en {anio}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {top.map((x, idx) => (
          <div key={x.mes}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 4,
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--tx1)' }}>
                <span style={{ color: 'var(--tx2)', marginRight: 6 }}>{idx + 1}.</span>
                {MESES[x.mes]}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{formatEur(x.total, true)}</span>
            </div>
            <ProgressBar value={max > 0 ? (x.total / max) * 100 : 0} />
          </div>
        ))}
      </div>
    </div>
  )
}
