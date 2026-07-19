import { useDeudas } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function DeudasWidget() {
  const { data, isLoading, isError } = useDeudas()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  if (!data || data.length === 0) return <WidgetEmpty message="Sin deudas activas. 🎉" />

  const total = sum(data.map((d) => d.cantidadPendiente))

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
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--tx2)' }}>
        Total: <strong className="down">{formatEur(total, true)}</strong>
      </div>
    </>
  )
}
