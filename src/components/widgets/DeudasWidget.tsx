import { useDeudas, useResumenDeuda } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

export default function DeudasWidget() {
  const { data, isLoading, isError } = useDeudas()
  const resumen = useResumenDeuda()

  if (isLoading || resumen.isLoading) return <WidgetLoading />
  if (isError || resumen.isError) return <WidgetError />
  if (!data || data.length === 0) return <WidgetEmpty message="Sin deudas activas. 🎉" />

  // Total pendiente y progreso global calculados en el backend (resumen de deudas).
  const total = resumen.data?.totalPendiente ?? 0
  const pagado = Number(resumen.data?.totalPagado ?? 0)
  const totalConIntereses = Number(resumen.data?.totalConIntereses ?? 0)
  const pct = totalConIntereses > 0 ? Math.min(100, (pagado / totalConIntereses) * 100) : 0

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Nombre</th>
            <th style={{ width: '30%' }}>Acreedor</th>
            <th style={{ width: '30%', textAlign: 'right' }}>Pendiente</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.nombreDeuda}-${i}`}>
              <td>{d.nombreDeuda}</td>
              <td style={{ color: 'var(--tx2)' }}>{d.acreedor || '—'}</td>
              <td style={{ textAlign: 'right' }} className="down">
                {formatEur(d.cantidadPendiente, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            fontSize: 11,
            color: 'var(--tx2)',
          }}
        >
          <span>
            Total: <strong className="down">{formatEur(total, true)}</strong>
          </span>
          <span>Pagado {Math.round(pct)}%</span>
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
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--amber), var(--coral))',
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </>
  )
}
