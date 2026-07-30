import { useState } from 'react'
import { PALETTE } from '@/lib/chartSetup'
import s from './ColorPicker.module.css'

/** Nombre legible de cada color de la paleta corta, para lectores de pantalla. */
const NOMBRES: Record<string, string> = {
  '#2f81f7': 'Azul',
  '#1d9e75': 'Verde',
  '#d29922': 'Ámbar',
  '#8b7ec8': 'Morado',
  '#d85a30': 'Coral',
  '#d4537e': 'Rosa',
  '#6e7681': 'Gris',
}

/**
 * Paleta ampliada: 12 tonos × 4 intensidades. Se recorre por columnas (cada
 * columna es un tono, de más claro a más oscuro) y todos los colores tienen
 * contraste suficiente tanto en tema claro como en oscuro.
 */
const TONOS: { nombre: string; escala: string[] }[] = [
  { nombre: 'Rojo', escala: ['#f87171', '#ef4444', '#dc2626', '#b91c1c'] },
  { nombre: 'Naranja', escala: ['#fb923c', '#f97316', '#ea580c', '#c2410c'] },
  { nombre: 'Ámbar', escala: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'] },
  { nombre: 'Lima', escala: ['#a3e635', '#84cc16', '#65a30d', '#4d7c0f'] },
  { nombre: 'Verde', escala: ['#4ade80', '#22c55e', '#16a34a', '#15803d'] },
  { nombre: 'Turquesa', escala: ['#2dd4bf', '#14b8a6', '#0d9488', '#0f766e'] },
  { nombre: 'Cian', escala: ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490'] },
  { nombre: 'Azul', escala: ['#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'] },
  { nombre: 'Índigo', escala: ['#818cf8', '#6366f1', '#4f46e5', '#4338ca'] },
  { nombre: 'Morado', escala: ['#c084fc', '#a855f7', '#9333ea', '#7e22ce'] },
  { nombre: 'Rosa', escala: ['#f472b6', '#ec4899', '#db2777', '#be185d'] },
  { nombre: 'Pizarra', escala: ['#94a3b8', '#64748b', '#475569', '#334155'] },
]

const INTENSIDADES = ['claro', 'medio', 'oscuro', 'muy oscuro']

// La rejilla se pinta por filas (una intensidad por fila, un tono por columna).
const FILAS = INTENSIDADES.map((intensidad, i) => ({
  intensidad,
  colores: TONOS.map((t) => ({ hex: t.escala[i], nombre: `${t.nombre} ${intensidad}` })),
}))

interface Props {
  /** Color elegido en hex, o null para dejar que se asigne automáticamente. */
  value: string | null
  onChange: (color: string | null) => void
  /** Colores ya en uso por otras categorías del mismo grupo: se marcan. */
  usados?: string[]
  ariaLabel?: string
}

/**
 * Colores de marca a un clic, con una paleta ampliada (48 colores) y un color
 * totalmente libre detrás del botón "+". El campo no es obligatorio: la opción
 * "A" deja el color en null y el backend asigna el primero libre dentro del
 * mismo tipo de movimiento.
 */
export default function ColorPicker({ value, onChange, usados = [], ariaLabel = 'Color' }: Props) {
  const enUso = new Set(usados.map((c) => c.toLowerCase()))
  const seleccionado = value?.toLowerCase() ?? null
  // Un color fuera de la paleta corta solo se ve si se despliega la ampliada,
  // así que el botón "+" lo muestra y la rejilla arranca abierta.
  const esAmpliado = seleccionado !== null && !PALETTE.includes(seleccionado)
  const [abierta, setAbierta] = useState(esAmpliado)

  return (
    <div>
      <div className={s.grid} role="radiogroup" aria-label={ariaLabel}>
        <button
          type="button"
          role="radio"
          aria-checked={seleccionado === null}
          aria-label="Color automático"
          title="Automático: se elige un color libre"
          className={`${s.swatch} ${s.auto} ${seleccionado === null ? s.selected : ''}`}
          onClick={() => onChange(null)}
        >
          <span className={s.fill} aria-hidden="true">
            A
          </span>
        </button>

        {PALETTE.map((color) => {
          const usado = enUso.has(color) && seleccionado !== color
          return (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={seleccionado === color}
              aria-label={`${NOMBRES[color] ?? color}${usado ? ' (ya usado en este grupo)' : ''}`}
              title={usado ? `${NOMBRES[color] ?? color} · ya usado en este grupo` : NOMBRES[color]}
              className={`${s.swatch} ${seleccionado === color ? s.selected : ''} ${usado ? s.usado : ''}`}
              onClick={() => onChange(color)}
            >
              <span className={s.fill} style={{ background: color }} />
            </button>
          )
        })}

        <button
          type="button"
          aria-expanded={abierta}
          aria-label="Más colores"
          title="Más colores"
          className={`${s.swatch} ${esAmpliado ? s.selected : ''}`}
          onClick={() => setAbierta((v) => !v)}
        >
          <span
            className={`${s.fill} ${esAmpliado ? '' : s.masFill}`}
            style={esAmpliado ? { background: seleccionado! } : undefined}
            aria-hidden="true"
          >
            {!esAmpliado && <span className={s.masIcon}>+</span>}
          </span>
        </button>
      </div>

      {abierta && (
        <div className={s.extendida}>
          <div className={s.rejilla} role="radiogroup" aria-label="Paleta ampliada">
            {FILAS.map((fila) =>
              fila.colores.map(({ hex, nombre }) => {
                const usado = enUso.has(hex) && seleccionado !== hex
                return (
                  <button
                    key={hex}
                    type="button"
                    role="radio"
                    aria-checked={seleccionado === hex}
                    aria-label={`${nombre}${usado ? ' (ya usado en este grupo)' : ''}`}
                    title={usado ? `${nombre} · ya usado en este grupo` : nombre}
                    className={`${s.mini} ${seleccionado === hex ? s.miniSelected : ''} ${usado ? s.usado : ''}`}
                    style={{ background: hex }}
                    onClick={() => onChange(hex)}
                  />
                )
              }),
            )}
          </div>

          <label className={s.personalizado}>
            <input
              className={s.inputColor}
              type="color"
              value={seleccionado ?? '#2f81f7'}
              onChange={(e) => onChange(e.target.value.toLowerCase())}
            />
            Color personalizado
            {seleccionado && <span className={s.hex}>{seleccionado}</span>}
          </label>
        </div>
      )}

      {seleccionado === null && (
        <p className={s.hint}>Se asignará un color que no use ninguna otra categoría del grupo.</p>
      )}
    </div>
  )
}
