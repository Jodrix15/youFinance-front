import { Link } from 'react-router-dom'
import { useIngresosResumen } from '@/hooks/useFinance'
import { formatEur, formatPct } from '@/lib/format'
import { DonutChart } from '@/components/ui/DonutChart'
import type { OrigenIngreso } from '@/types/api'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

// Colores en hex (no var CSS): Chart.js pinta sobre canvas y no resuelve variables.
const FAMILIAS: { key: OrigenIngreso; label: string; color: string }[] = [
  { key: 'ACTIVO', label: 'Activo', color: '#1d9e75' },
  { key: 'PASIVO', label: 'Pasivo', color: '#2f81f7' },
  { key: 'INVERSION', label: 'Inversión', color: '#8b7ec8' },
]

const SIN = { label: 'Sin clasificar', color: '#6e7681' }

export default function IngresosFamiliaWidget() {
  const { data, isLoading, isError } = useIngresosResumen()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const total = data?.total ?? 0
  if (total === 0) return <WidgetEmpty message="Sin ingresos registrados." />

  const porFamilia = (data?.familias ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.familia ?? 'SIN'] = Number(f.total || 0)
    return acc
  }, {})

  const items = [
    ...FAMILIAS.map((f) => ({ ...f, amount: porFamilia[f.key] ?? 0 })),
    ...(porFamilia['SIN'] ? [{ key: 'SIN', ...SIN, amount: porFamilia['SIN'] }] : []),
  ].filter((i) => i.amount > 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 130, flexShrink: 0 }}>
        <DonutChart
          legend={false}
          labels={items.map((i) => i.label)}
          values={items.map((i) => i.amount)}
          colors={items.map((i) => i.color)}
          tooltipLabel={(c) => {
            const pct = total ? (Number(c.parsed) / total) * 100 : 0
            return ` ${c.label}: ${formatEur(Number(c.parsed))} · ${formatPct(pct)}`
          }}
        />
      </div>
      <div style={{ marginTop: 10, overflow: 'auto', flex: 1 }}>
        {items.map((i) => (
          <div
            key={i.key}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}
          >
            <span
              style={{ width: 10, height: 10, borderRadius: 2, background: i.color, flexShrink: 0 }}
            />
            <span style={{ flex: 1, color: 'var(--tx1)' }}>{i.label}</span>
            <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{formatEur(i.amount)}</span>
            <span style={{ color: 'var(--tx2)', width: 48, textAlign: 'right' }}>
              {formatPct(total ? (i.amount / total) * 100 : 0)}
            </span>
          </div>
        ))}
      </div>
      <Link
        to="/ingresos"
        style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--accent)',
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        Ver detalle de ingresos →
      </Link>
    </div>
  )
}
