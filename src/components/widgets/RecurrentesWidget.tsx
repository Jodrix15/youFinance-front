import { useRecurrentes } from '@/hooks/useFinance'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'
import c from './WidgetCard.module.css'

export default function RecurrentesWidget() {
  const { data, isLoading, isError } = useRecurrentes()
  const isMobile = useIsMobile()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  const activos = (data ?? []).filter((r) => r.active)
  if (activos.length === 0) return <WidgetEmpty message="Sin gastos recurrentes activos." />

  // En móvil la tabla de cuatro columnas no cabe: una fila por gasto con lo
  // imprescindible (nombre e importe) y el total al pie.
  if (isMobile) {
    // Los gastos anuales se prorratean a mes para que el total sea comparable.
    const totalMensual = activos.reduce((acc, r) => {
      const importe = Number(r.importeActual ?? 0)
      return acc + (r.frecuencia === 'ANUAL' ? importe / 12 : importe)
    }, 0)

    return (
      <div>
        <ul className={c.filas}>
          {activos.map((r) => (
            <li key={r.id} className={c.fila}>
              <span className={c.nombre}>{r.nombre}</span>
              <span className={c.importe}>
                {r.importeActual != null ? formatEur(r.importeActual, true) : '—'}
              </span>
            </li>
          ))}
        </ul>
        <div className={c.pie} title="Los gastos anuales cuentan como su doceava parte">
          <span className={c.pieLabel}>Total al mes</span>
          <span className={c.pieValor}>{formatEur(totalMensual, true)}</span>
        </div>
      </div>
    )
  }

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Frecuencia</th>
          <th style={{ textAlign: 'right' }}>Importe</th>
          <th style={{ textAlign: 'right' }}>Próximo pago</th>
        </tr>
      </thead>
      <tbody>
        {activos.map((r) => (
          <tr key={r.id}>
            <td data-label="Nombre">{r.nombre}</td>
            <td data-label="Frecuencia" style={{ textTransform: 'capitalize' }}>{r.frecuencia.toLowerCase()}</td>
            <td data-label="Importe" style={{ textAlign: 'right' }}>
              {r.importeActual != null ? formatEur(r.importeActual, true) : '—'}
            </td>
            <td data-label="Próximo pago" style={{ textAlign: 'right' }}>{r.fechaProximoPago ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
