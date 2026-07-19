import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import s from './Select.module.css'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectProps<T extends string> {
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  id?: string
  ariaLabel?: string
  className?: string
}

/**
 * Desplegable temático (reemplaza al <select> nativo, que en tema oscuro pinta
 * el panel de opciones con estilos del sistema operativo). Soporta teclado
 * (flechas, Enter, Escape) y cierre al hacer clic fuera.
 */
export default function Select<T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Selecciona…',
  disabled = false,
  invalid = false,
  id,
  ariaLabel,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const autoId = useId()
  const fieldId = id ?? autoId

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (open) setActive(options.findIndex((o) => o.value === value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function choose(v: T) {
    onChange(v)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActive((i) => Math.min(options.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!open) setOpen(true)
        else setActive((i) => Math.max(0, i - 1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!open) setOpen(true)
        else if (active >= 0) choose(options[active].value)
        break
      case 'Escape':
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className={`${s.wrap} ${className ?? ''}`} ref={wrapRef}>
      <button
        type="button"
        id={fieldId}
        className={s.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? s.value : s.placeholder}>
          {selected ? selected.label : placeholder}
        </span>
        <svg
          className={`${s.chevron} ${open ? s.chevronOpen : ''}`}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M3.204 5h9.592L8 10.481zm-.753.659 4.796 5.48a1 1 0 0 0 1.506 0l4.796-5.48c.566-.647.106-1.659-.753-1.659H3.204a1 1 0 0 0-.753 1.659" />
        </svg>
      </button>

      {open && (
        <ul className={s.panel} role="listbox">
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${s.option} ${o.value === value ? s.selected : ''} ${
                i === active ? s.active : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(o.value)
              }}
            >
              <span className={s.optionLabel}>{o.label}</span>
              {o.value === value && (
                <svg className={s.check} viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
