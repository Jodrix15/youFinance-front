import { useDeudas, useRecurrentes, useResumenDashboard } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { gastosFijosDelMes } from '@/lib/gastosFijos'
import { WidgetError, WidgetLoading } from './WidgetState'
import s from './MetricsWidget.module.css'

export default function MetricsWidget() {
  const { patrimonioNeto, capitalCuentas, capitalInversion, capitalDeuda, isLoading, isError } =
    useResumenDashboard()
  const rec = useRecurrentes()
  const deu = useDeudas()

  if (isLoading || rec.isLoading || deu.isLoading) return <WidgetLoading />
  if (isError || rec.isError || deu.isError) return <WidgetError />

  // Pago fijo total del próximo mes natural (recurrentes + suscripciones + deudas).
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextYm = { year: next.getFullYear(), month: next.getMonth() + 1 }
  const pagoProximoMes = gastosFijosDelMes(rec.data, deu.data, nextYm).total

  const metrics = [
    {
      label: 'Patrimonio neto',
      value: formatEur(patrimonioNeto),
      color: patrimonioNeto >= 0 ? 'var(--up)' : 'var(--down)',
    },
    { label: 'Cuentas / ahorros', value: formatEur(capitalCuentas), color: undefined },
    {
      label: 'Inversiones',
      value: formatEur(capitalInversion),
      color: capitalInversion >= 0 ? 'var(--up)' : 'var(--down)',
    },
    { label: 'Deuda total', value: formatEur(capitalDeuda), color: 'var(--down)' },
    {
      label: 'Gasto fijo próximo mes',
      value: formatEur(pagoProximoMes),
      color: 'var(--amber)',
    },
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
