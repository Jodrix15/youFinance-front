import type { ReactNode } from 'react'
import s from './WidgetFrame.module.css'

interface Props {
  title: string
  onHide?: () => void
  children: ReactNode
}

export default function WidgetFrame({ title, onHide, children }: Props) {
  return (
    <div className={s.frame}>
      {/* Toda la cabecera es el asa de arrastre (clase global widget-drag-handle) */}
      <div className={`${s.head} widget-drag-handle`}>
        <span className={s.grip} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="4" cy="3" r="1.3" />
            <circle cx="4" cy="8" r="1.3" />
            <circle cx="4" cy="13" r="1.3" />
            <circle cx="10" cy="3" r="1.3" />
            <circle cx="10" cy="8" r="1.3" />
            <circle cx="10" cy="13" r="1.3" />
          </svg>
        </span>
        <span className={s.title}>{title}</span>
        {onHide && (
          <button
            className={`${s.hideBtn} widget-no-drag`}
            onClick={onHide}
            onMouseDown={(e) => e.stopPropagation()}
            title="Ocultar widget"
            aria-label="Ocultar widget"
          >
            ×
          </button>
        )}
      </div>
      <div className={s.body}>{children}</div>
    </div>
  )
}
