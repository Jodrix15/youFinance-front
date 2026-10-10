import type { PlataformaInversion } from '@/types/api'
import { PALETTE } from '@/lib/chartSetup'

export const PLATAFORMAS: { value: PlataformaInversion; label: string }[] = [
  { value: 'BROKER', label: 'Broker' },
  { value: 'FONDOS', label: 'Fondos' },
  { value: 'P2P', label: 'P2P / Crowdlending' },
  { value: 'ROBOADVISOR', label: 'Roboadvisor' },
  { value: 'CRIPTO', label: 'Cripto' },
  { value: 'OTRO', label: 'Otro' },
]

export const plataformaLabel = (p: PlataformaInversion | null | undefined) =>
  PLATAFORMAS.find((x) => x.value === p)?.label ?? null

/** Color de una cuenta; sin él, la paleta por posición. */
export const colorCuenta = (color: string | null | undefined, idx: number) =>
  color ?? PALETTE[idx % PALETTE.length]

/** Valor por defecto de "Sin cuenta" en los selects (Select trabaja con strings). */
export const SIN_CUENTA = ''

/** Nombre para mostrar de una posición: el activo o, si no tiene, la categoría. */
export const nombreActivo = (i: { id: number; nombre: string | null; categoriaNombre: string | null }) =>
  i.nombre?.trim() || i.categoriaNombre || `#${i.id}`

export const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

export const hoyISO = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
