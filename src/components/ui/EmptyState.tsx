import type { ReactNode } from 'react'
import s from './EmptyState.module.css'

type Props = {
  /** Icono opcional (SVG). */
  icon?: ReactNode
  message: string
  actionLabel: string
  onAction: () => void
}

/** Estado vacío con acción directa: en vez de solo texto, ofrece un botón. */
export default function EmptyState({ icon, message, actionLabel, onAction }: Props) {
  return (
    <div className={s.wrap}>
      {icon && <div className={s.icon}>{icon}</div>}
      <p className={s.msg}>{message}</p>
      <button type="button" className={s.btn} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
