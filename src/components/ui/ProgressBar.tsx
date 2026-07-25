import s from './ProgressBar.module.css'

/** Barra de progreso (0-100). El relleno usa el degradado ámbar→coral de marca. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div className={className ? `${s.track} ${className}` : s.track}>
      <div className={s.fill} style={{ width: `${pct}%` }} />
    </div>
  )
}
