import type { ReactNode } from 'react'
import s from './StatCard.module.css'

/** Rejilla responsive de tarjetas KPI. */
export function StatGrid({ children }: { children: ReactNode }) {
  return <div className={s.grid}>{children}</div>
}

/** Tarjeta KPI: etiqueta + valor destacado. `color` tiñe solo el valor. */
export function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: ReactNode
  color?: string
}) {
  return (
    <div className={s.card}>
      <div className={s.label}>{label}</div>
      <div className={s.value} style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  )
}
