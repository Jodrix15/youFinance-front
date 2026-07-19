import { useCuentas, useDeudas, useInversiones } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'
import s from './MetricsWidget.module.css'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function MetricsWidget() {
  const cuentas = useCuentas()
  const inversiones = useInversiones()
  const deudas = useDeudas()

  if (cuentas.isLoading || inversiones.isLoading || deudas.isLoading)
    return <WidgetLoading />
  if (cuentas.isError || inversiones.isError || deudas.isError) return <WidgetError />

  const totalCuentas = sum((cuentas.data ?? []).map((c) => c.importe))
  const totalInv = sum((inversiones.data ?? []).map((i) => i.capitalTotal))
  const totalDeuda = sum((deudas.data ?? []).map((d) => d.cantidadPendiente))
  const patrimonioNeto = totalCuentas + totalInv - totalDeuda

  const metrics = [
    { label: 'Patrimonio neto', value: formatEur(patrimonioNeto), color: undefined },
    { label: 'Cuentas / ahorros', value: formatEur(totalCuentas), color: undefined },
    { label: 'Inversiones', value: formatEur(totalInv), color: undefined },
    { label: 'Deuda total', value: formatEur(totalDeuda), color: 'var(--down)' },
  ]

  return (
    <div className={s.grid}>
      {metrics.map((m) => (
        <div key={m.label} className={s.card}>
          <div className={s.label}>{m.label}</div>
          <div className={s.value} style={m.color ? { color: m.color } : undefined}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  )
}
