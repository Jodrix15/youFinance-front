import { useState } from 'react'
import Select from './Select'
import s from './CategoriaSelect.module.css'

interface Props {
  value: string
  onChange: (nombre: string) => void
  categorias: { nombre: string }[]
  invalid?: boolean
  placeholder?: string
}

const NEW = '__new__'

/**
 * Desplegable de categorías con una opción "Crear nueva categoría" que cambia a
 * un input de texto. El valor es siempre el nombre de la categoría; si es uno
 * nuevo, el formulario lo crea al guardar (resolverCategoriaId).
 */
export default function CategoriaSelect({
  value,
  onChange,
  categorias,
  invalid,
  placeholder = 'Selecciona categoría',
}: Props) {
  const [creating, setCreating] = useState(false)
  const known = categorias.some((c) => c.nombre === value)

  if (creating) {
    return (
      <div className={s.createRow}>
        <input
          className={s.input}
          type="text"
          autoFocus
          placeholder="Nombre de la nueva categoría"
          value={value}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (!value.trim()) setCreating(false)
          }}
        />
        <button
          type="button"
          className={s.backBtn}
          title="Elegir de la lista"
          aria-label="Elegir de la lista"
          onClick={() => {
            onChange('')
            setCreating(false)
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <Select
      value={known ? value : ''}
      options={[
        ...categorias.map((c) => ({ value: c.nombre, label: c.nombre })),
        { value: NEW, label: '＋ Crear nueva categoría' },
      ]}
      placeholder={placeholder}
      invalid={invalid}
      ariaLabel="Categoría"
      onChange={(v) => {
        if (v === NEW) {
          onChange('')
          setCreating(true)
        } else {
          onChange(v)
        }
      }}
    />
  )
}
