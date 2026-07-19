import { useRecurrentes } from '@/hooks/useFinance'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

export default function RecurrentesWidget() {
  const { data, isLoading, isError } = useRecurrentes()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  const activos = (data ?? []).filter((r) => r.active)
  if (activos.length === 0) return <WidgetEmpty message="Sin gastos recurrentes activos." />

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Frecuencia</th>
          <th style={{ textAlign: 'right' }}>Próximo pago</th>
        </tr>
      </thead>
      <tbody>
        {activos.map((r) => (
          <tr key={r.id}>
            <td>{r.nombre}</td>
            <td style={{ textTransform: 'capitalize' }}>{r.frecuencia.toLowerCase()}</td>
            <td style={{ textAlign: 'right' }}>{r.fechaProximoPago ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
