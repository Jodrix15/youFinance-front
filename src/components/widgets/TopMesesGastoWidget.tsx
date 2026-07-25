import { useMovimientos } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function TopMesesGastoWidget() {
  const { data: movs, isLoading, isError } = useMovimientos()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const anio = new Date().getFullYear() - 1

  // Suma de gastos por mes del año anterior.
  const porMes = new Array(12).fill(0)
  ;(movs ?? [])
    .filter((m) => m.tipoMovimiento === 'GASTO' && m.fechaTransaccion?.slice(0, 4) === String(anio))
    .forEach((m) => {
      const mes = Number(m.fechaTransaccion.slice(5, 7)) - 1
      if (mes >= 0 && mes < 12) porMes[mes] += Math.abs(Number(m.importe || 0))
    })

  const top = porMes
    .map((total, mes) => ({ mes, total }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

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
            <div
              style={{
                height: 8,
                background: 'var(--bg3)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${max > 0 ? (x.total / max) * 100 : 0}%`,
                  background: 'linear-gradient(90deg, var(--amber), var(--coral))',
                  borderRadius: 999,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
