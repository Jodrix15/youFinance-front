import type { MouseEvent, ReactNode } from 'react'

/**
 * Iconos de acción de fila. Se declaran aquí una sola vez para que las listas
 * (categorías, presupuestos, inversiones…) compartan el mismo lenguaje visual.
 */
const ICONS: Record<string, ReactNode> = {
  edit: (
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z" />
  ),
  delete: (
    <>
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" />
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" />
    </>
  ),
}

export type IconName = keyof typeof ICONS

type Props = {
  icon: IconName
  /** Texto accesible; se usa como aria-label y como tooltip. */
  label: string
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
  /** Resalta en rojo al pasar por encima (acciones destructivas). */
  danger?: boolean
}

/** Botón de acción compacto (solo icono) para filas y tarjetas de lista. */
export default function IconButton({ icon, label, onClick, disabled, danger }: Props) {
  return (
    <button
      type="button"
      className={`icon-btn${danger ? ' icon-btn-danger' : ''}`}
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        {ICONS[icon]}
      </svg>
    </button>
  )
}
