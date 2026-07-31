import { useDeudas, useResumenDeuda } from '@/hooks/useFinance'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { formatEur } from '@/lib/format'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'
import c from './WidgetCard.module.css'

export default function DeudasWidget() {
  const { data, isLoading, isError } = useDeudas()
  const resumen = useResumenDeuda()
  const isMobile = useIsMobile()

  if (isLoading || resumen.isLoading) return <WidgetLoading />
  if (isError || resumen.isError) return <WidgetError />
  if (!data || data.length === 0) return <WidgetEmpty message="Sin deudas activas. 🎉" />

  // Total pendiente y progreso global calculados en el backend (resumen de deudas).
  const total = resumen.data?.totalPendiente ?? 0
  const pagado = Number(resumen.data?.totalPagado ?? 0)
  const totalConIntereses = Number(resumen.data?.totalConIntereses ?? 0)
  const pct = totalConIntereses > 0 ? Math.min(100, (pagado / totalConIntereses) * 100) : 0

  const resumenGlobal = (
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
      <ProgressBar value={pct} />
    </div>
  )

  // En móvil, una fila por deuda con el pendiente a la derecha; el acreedor y el
  // resto del detalle viven en la sección de Deudas.
  if (isMobile) {
    return (
      <>
        <ul className={c.filas}>
          {data.map((d, i) => (
            <li key={`${d.nombreDeuda}-${i}`} className={c.fila}>
              <span className={c.nombre}>{d.nombreDeuda}</span>
              <span className={`${c.importe} ${c.importeDown}`}>
                {formatEur(d.cantidadPendiente, true)}
              </span>
            </li>
          ))}
        </ul>
        {resumenGlobal}
      </>
    )
  }

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
              <td data-label="Nombre">{d.nombreDeuda}</td>
              <td data-label="Acreedor" style={{ color: 'var(--tx2)' }}>{d.acreedor || '—'}</td>
              <td data-label="Pendiente" style={{ textAlign: 'right' }} className="down">
                {formatEur(d.cantidadPendiente, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {resumenGlobal}
    </>
  )
}
