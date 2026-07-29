import type { OrigenIngreso } from '@/types/api'

/**
 * Familia de un ingreso según el esfuerzo que exige. Se pide al crear una
 * categoría de tipo INGRESO (el backend la rechaza sin ella), y se usa tanto en
 * Ajustes → Categorías como en el modal de movimientos de una cuenta.
 *
 * `ejemplos` es solo ayuda para el desplegable: mucha gente no distingue los
 * términos. Los badges y las leyendas usan `label` a secas.
 */
export const FAMILIAS: { value: OrigenIngreso; label: string; ejemplos: string }[] = [
  { value: 'ACTIVO', label: 'Activo', ejemplos: 'nómina, freelance, propinas' },
  { value: 'PASIVO', label: 'Pasivo', ejemplos: 'alquileres, royalties, anuncios' },
  { value: 'INVERSION', label: 'Inversión', ejemplos: 'dividendos, intereses, plusvalías' },
]

/** Opciones del desplegable, con los ejemplos entre paréntesis. */
export const FAMILIA_OPTIONS = FAMILIAS.map((f) => ({
  value: f.value,
  label: `${f.label} (${f.ejemplos})`,
}))

/** Nombre corto de una familia, para badges y leyendas. */
export function familiaLabel(o: OrigenIngreso): string {
  return FAMILIAS.find((f) => f.value === o)?.label ?? o
}
