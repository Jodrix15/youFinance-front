import { Fragment, useState } from 'react'
import { formatEur, formatPct } from '@/lib/format'
import type { InversionResponse } from '@/types/api'
import { nombreActivo } from './common'
import s from '@/pages/Inversiones.module.css'

/** Grupo de posiciones: una cuenta o una categoría (clase de activo). */
export type GrupoPosiciones = {
  key: string
  nombre: string
  color: string
  items: InversionResponse[]
  aportado: number
  valor: number
  plusvalia: number
  pct: number
}

type SortField = 'nombre' | 'segunda' | 'aportado' | 'total' | 'plusvalia' | 'pct'

const colorSigno = (n: number) => (n >= 0 ? 'var(--up)' : 'var(--down)')

/**
 * Tabla única de posiciones con filas de grupo plegables: cada grupo muestra
 * sus totales y, al hacer clic, despliega sus posiciones debajo. Todos los
 * grupos empiezan plegados.
 */
export default function PosicionesAgrupadas({
  grupos,
  segunda,
}: {
  grupos: GrupoPosiciones[]
  /**
   * Qué muestra la segunda columna: la cuenta (al agrupar por categoría) o la
   * categoría (al agrupar por cuenta). La primera siempre es el activo.
   */
  segunda: 'cuenta' | 'categoria'
}) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggle(key: string) {
    setAbiertos((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }
  function sortInd(field: SortField) {
    const active = sortField === field
    return (
      <span className={s.sortArrow} data-active={active ? 'true' : undefined}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    )
  }

  const dir = sortDir === 'asc' ? 1 : -1
  const cmp = (a: number | string, b: number | string) =>
    (typeof a === 'string' && typeof b === 'string' ? a.localeCompare(b) : Number(a) - Number(b)) * dir

  // La ordenación se aplica a los grupos (por sus totales) y a las posiciones de cada uno.
  const claveGrupo = (g: GrupoPosiciones): number | string => {
    switch (sortField) {
      case 'aportado':
        return g.aportado
      case 'total':
        return g.valor
      case 'plusvalia':
        return g.plusvalia
      case 'pct':
        return g.pct
      default:
        return g.nombre.toLowerCase()
    }
  }
  const claveItem = (i: InversionResponse): number | string => {
    switch (sortField) {
      case 'nombre':
        return nombreActivo(i).toLowerCase()
      case 'segunda':
        return valorSegunda(i).toLowerCase()
      case 'aportado':
        return Number(i.capitalAportado || 0)
      case 'total':
        return Number(i.capitalTotal || 0)
      case 'plusvalia':
        return Number(i.plusvalia || 0)
      case 'pct':
        return Number(i.porcentajePlusvalia || 0)
      default:
        return 0
    }
  }
  const etiquetaSegunda = segunda === 'cuenta' ? 'Cuenta' : 'Categoría'
  function valorSegunda(i: InversionResponse) {
    return segunda === 'cuenta' ? (i.cuentaNombre ?? 'Sin cuenta') : (i.categoriaNombre ?? '—')
  }

  const gruposOrdenados = sortField
    ? [...grupos].sort((a, b) => cmp(claveGrupo(a), claveGrupo(b)))
    : grupos

  return (
    <table className={`tbl ${s.table} ${s.groupTable}`} style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th className={s.sortable} onClick={() => toggleSort('nombre')}>
            Activo{sortInd('nombre')}
          </th>
          <th className={s.sortable} onClick={() => toggleSort('segunda')}>
            {etiquetaSegunda}
            {sortInd('segunda')}
          </th>
          <th className={`${s.center} ${s.sortable}`} onClick={() => toggleSort('aportado')}>
            Aportado{sortInd('aportado')}
          </th>
          <th className={`${s.center} ${s.sortable}`} onClick={() => toggleSort('total')}>
            Valor actual{sortInd('total')}
          </th>
          <th className={`${s.center} ${s.sortable}`} onClick={() => toggleSort('plusvalia')}>
            Plusvalía{sortInd('plusvalia')}
          </th>
          <th className={`${s.center} ${s.sortable}`} onClick={() => toggleSort('pct')}>
            %{sortInd('pct')}
          </th>
        </tr>
      </thead>
      <tbody>
        {gruposOrdenados.map((g) => {
          const abierto = abiertos.has(g.key)
          const items = sortField
            ? [...g.items].sort((a, b) => cmp(claveItem(a), claveItem(b)))
            : g.items
          return (
            <Fragment key={g.key}>
              <tr
                className={s.groupRow}
                onClick={() => toggle(g.key)}
                aria-expanded={abierto}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggle(g.key)
                  }
                }}
              >
                <td colSpan={2}>
                  <span className={s.groupName}>
                    <span className={`${s.chev} ${abierto ? s.chevOpen : ''}`}>▶</span>
                    <span className={s.dot} style={{ background: g.color }} />
                    <span>
                      {g.nombre} <span className={s.groupCount}>({g.items.length})</span>
                    </span>
                  </span>
                </td>
                <td data-label="Aportado" className={s.center}>
                  {formatEur(g.aportado, true)}
                </td>
                <td data-label="Valor actual" className={s.center}>
                  {formatEur(g.valor, true)}
                </td>
                <td data-label="Plusvalía" className={s.center} style={{ color: colorSigno(g.plusvalia) }}>
                  {g.plusvalia > 0 ? '+' : ''}
                  {formatEur(g.plusvalia, true)}
                </td>
                <td data-label="%" className={s.center} style={{ color: colorSigno(g.pct) }}>
                  {formatPct(g.pct)}
                </td>
              </tr>
              {abierto && items.length === 0 && (
                <tr className={s.childRow}>
                  <td colSpan={6} className={s.muted} style={{ paddingLeft: 38 }}>
                    Sin posiciones todavía.
                  </td>
                </tr>
              )}
              {abierto &&
                items.map((i) => {
                  const nombre = nombreActivo(i)
                  return (
                    <tr key={i.id} className={s.childRow}>
                      <td data-label="Activo">
                        <span className={s.childName}>
                          <span
                            className={s.dot}
                            style={{ background: i.categoriaColor ?? 'var(--gray)' }}
                          />
                          {nombre}
                        </span>
                      </td>
                      <td data-label={etiquetaSegunda} className={s.muted}>
                        {valorSegunda(i)}
                      </td>
                      <td data-label="Aportado" className={s.center}>
                        {formatEur(i.capitalAportado, true)}
                      </td>
                      <td data-label="Valor actual" className={s.center}>
                        {formatEur(i.capitalTotal, true)}
                      </td>
                      <td
                        data-label="Plusvalía"
                        className={s.center}
                        style={{ color: colorSigno(Number(i.plusvalia)) }}
                      >
                        {Number(i.plusvalia) > 0 ? '+' : ''}
                        {formatEur(i.plusvalia, true)}
                      </td>
                      <td
                        data-label="%"
                        className={s.center}
                        style={{ color: colorSigno(Number(i.porcentajePlusvalia)) }}
                      >
                        {formatPct(i.porcentajePlusvalia)}
                      </td>
                    </tr>
                  )
                })}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
