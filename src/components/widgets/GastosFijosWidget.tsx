import { useState } from 'react'
import { useDeudas, useRecurrentes } from '@/hooks/useFinance'
import { formatEur } from '@/lib/format'
import { gastosFijosDelMes } from '@/lib/gastosFijos'
import { WidgetError, WidgetLoading } from './WidgetState'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export default function GastosFijosWidget() {
  const rec = useRecurrentes()
  const deu = useDeudas()
  // Offset en meses respecto al mes actual (0 = este mes).
  const [offset, setOffset] = useState(0)

  if (rec.isLoading || deu.isLoading) return <WidgetLoading />
  if (rec.isError || deu.isError) return <WidgetError />

  const now = new Date()
  const sel = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const ym = { year: sel.getFullYear(), month: sel.getMonth() + 1 }
  const { suscripciones, recurrentes, cuotasDeuda, total } = gastosFijosDelMes(
    rec.data, deu.data, ym,
  )

  const rows: [string, number][] = [
    ['Suscripciones', suscripciones],
    ['Recurrentes', recurrentes],
    ['Cuotas de deuda', cuotasDeuda],
  ]

  const navBtn: React.CSSProperties = {
    background: 'var(--bg3)',
    color: 'var(--tx1)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    width: 24,
    height: 24,
    lineHeight: '22px',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <button type="button" style={navBtn} onClick={() => setOffset((o) => o - 1)}
          aria-label="Mes anterior">‹</button>
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {MESES[ym.month - 1]} {ym.year}
          {offset === 0 && (
            <span style={{ color: 'var(--tx2)', fontWeight: 400 }}> · actual</span>
          )}
        </span>
        <button type="button" style={navBtn} onClick={() => setOffset((o) => o + 1)}
          aria-label="Mes siguiente">›</button>
      </div>

      {rows.map(([label, val]) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            fontSize: 13,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ color: 'var(--tx2)' }}>{label}</span>
          <span style={{ fontWeight: 600, color: 'var(--tx1)' }}>{formatEur(val, true)}</span>
        </div>
      ))}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 12,
          marginTop: 2,
          fontSize: 14,
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--tx1)' }}>Total {MESES[ym.month - 1]}</span>
        <span style={{ fontWeight: 700, color: 'var(--tx1)' }}>{formatEur(total, true)}</span>
      </div>
    </div>
  )
}
