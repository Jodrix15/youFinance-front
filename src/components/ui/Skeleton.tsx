import type { CSSProperties } from 'react'
import s from './Skeleton.module.css'

type Props = {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
  style?: CSSProperties
}

/** Bloque de carga con shimmer. Usa los tokens del tema. */
export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--r-sm)',
  className = '',
  style,
}: Props) {
  return (
    <span
      className={`${s.skeleton} ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  )
}
