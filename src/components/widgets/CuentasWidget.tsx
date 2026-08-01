import { useCuentas } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function CuentasWidget() {
  const { data, isLoading, isError } = useCuentas()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />
  if (!data || data.length === 0) return <WidgetEmpty message="Sin cuentas registradas." />

  const total = sum(data.map((c) => c.saldo))

  return (
    <>
      <table className="tbl">
        <thead>
          <tr>
            <th>Cuenta</th>
            <th style={{ textAlign: 'right' }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id}>
              <td data-label="Cuenta">{c.nombreCuenta}</td>
              <td data-label="Saldo" style={{ textAlign: 'right' }}>{formatEur(c.saldo, true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--tx2)' }}>
        Total: <strong style={{ color: 'var(--tx1)' }}>{formatEur(total, true)}</strong>
      </div>
    </>
  )
}
