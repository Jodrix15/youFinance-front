import { useGastosFijosMes, useResumenDashboard } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { WidgetError, WidgetLoading } from './WidgetState'
import s from './MetricsWidget.module.css'

// Próximo mes natural (constante durante la vida de la vista).
const next = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
const NEXT_YM = { year: next.getFullYear(), month: next.getMonth() + 1 }

export default function MetricsWidget() {
  const { patrimonioNeto, capitalCuentas, capitalInversion, capitalDeuda, isLoading, isError } =
    useResumenDashboard()
  // Gasto fijo del próximo mes, calculado en el backend.
  const gastosFijos = useGastosFijosMes(NEXT_YM.year, NEXT_YM.month)

  if (isLoading || gastosFijos.isLoading) return <WidgetLoading />
  if (isError || gastosFijos.isError) return <WidgetError />

  const pagoProximoMes = Number(gastosFijos.data?.total ?? 0)

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
