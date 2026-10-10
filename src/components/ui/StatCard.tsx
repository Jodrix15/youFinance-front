import type { ReactNode } from 'react'
import s from './StatCard.module.css'

/** Rejilla responsive de tarjetas KPI. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.grid}>{children}</div>
}

/**
 * Tarjeta KPI: etiqueta + valor destacado. `color` tiñe solo el valor.
 * `hint` es una línea secundaria opcional bajo el valor.
 */
export function StatCard({
  label,
  value,
  color,
  hint,
}: {
  label: string
  value: ReactNode
  color?: string
  hint?: ReactNode
}) {
  return (
    <div className={s.card}>
      <div className={s.label}>{label}</div>
      <div className={s.value} style={color ? { color } : undefined}>
        {value}
      </div>
      {hint != null && <div className={s.hint}>{hint}</div>}
    </div>
  )
}
