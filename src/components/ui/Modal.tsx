import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import s from './Modal.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Ancho máximo del panel. Por defecto 420px. */
  maxWidth?: number
  /** Cerrar al pulsar el fondo. Por defecto true. */
  closeOnBackdrop?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 420,
  closeOnBackdrop = true,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const prevFocus = useRef<HTMLElement | null>(null)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
        if (nodes.length === 0) {
          e.preventDefault()
          return
        }
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        const active = document.activeElement
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose],
  )

  // El listener se registra una sola vez por apertura, pero necesita llamar
  // siempre a la última versión de handleKey. Por eso va por ref: si handleKey
  // fuese dependencia del efecto de abajo, cualquier cambio de `onClose` lo
  // reiniciaría.
  const handleKeyRef = useRef(handleKey)
  useEffect(() => {
    handleKeyRef.current = handleKey
  }, [handleKey])

  // IMPORTANTE: este efecto depende SOLO de `open`.
  //
  // Antes dependía también de `handleKey`, que se recrea cada vez que cambia
  // `onClose`. Como los padres pasan `onClose` como función nueva en cada render
  // (o como useCallback que depende de su estado), cada pulsación de tecla en un
  // campo del formulario re-renderizaba el padre → nuevo onClose → nuevo
  // handleKey → React ejecutaba la limpieza y volvía a montar el efecto. La
  // limpieza hace `prevFocus.current?.focus()` y el efecto vuelve a enfocar el
  // primer campo del panel: de ahí que el foco saltara a otro campo al escribir
  // y que no se pudieran teclear números seguidos ni crear una categoría nueva.
  useEffect(() => {
    if (!open) return
    // Guardar el foco previo y bloquear el scroll del body.
    prevFocus.current = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => handleKeyRef.current(e)
    document.addEventListener('keydown', onKeyDown, true)

    // Enfocar el primer elemento útil del panel (o el panel).
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(focusable ?? panel).focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      document.body.style.overflow = prevOverflow
      // Restaurar el foco al elemento que abrió el modal.
      prevFocus.current?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={s.panel}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        {title && <div className={s.title}>{title}</div>}
        <div className={s.body}>{children}</div>
        {footer && <div className={s.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
