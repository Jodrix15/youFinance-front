import s from './Tabs.module.css'

/** Selector segmentado reutilizable (rangos, filtros, pestañas). */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={className ? `${s.tabs} ${className}` : s.tabs}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`${s.tab} ${value === o.value ? s.active : ''}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
