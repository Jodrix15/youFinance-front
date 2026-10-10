import { useState } from 'react'
import IconButton from '@/components/ui/IconButton'
import { formatEur, formatPct } from '@/lib/format'
import type { InversionResponse } from '@/types/api'
import { nombreActivo } from './common'
import s from '@/pages/Inversiones.module.css'

type SortField = 'nombre' | 'extra' | 'aportado' | 'total' | 'plusvalia' | 'pct'

/**
 * Tabla de posiciones. `extra` añade una segunda columna de texto: la cuenta
 * (al agrupar por clase de activo) o la categoría (al agrupar por cuenta ya la
 * lleva la primera columna, así que ahí no se usa).
 */
export default function PosicionesTabla({
  items,
  extra,
  onEdit,
  onDelete,
  disabled,
}: {
  items: InversionResponse[]
  extra?: { label: string; value: (i: InversionResponse) => string }
  /** Sin onEdit/onDelete la tabla es solo informativa (sin clic ni acciones). */
  onEdit?: (i: InversionResponse) => void
  onDelete?: (i: InversionResponse) => void
  disabled?: boolean
}) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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

  const editable = !!onEdit
  const nombre = nombreActivo
  const sorted = sortField
    ? [...items].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        const key = (i: InversionResponse): number | string => {
          switch (sortField) {
            case 'nombre':
              return nombre(i).toLowerCase()
            case 'extra':
              return (extra?.value(i) ?? '').toLowerCase()
            case 'aportado':
              return Number(i.capitalAportado || 0)
            case 'total':
              return Number(i.capitalTotal || 0)
            case 'plusvalia':
              return Number(i.plusvalia || 0)
            case 'pct':
              return Number(i.porcentajePlusvalia || 0)
          }
        }
        const va = key(a)
        const vb = key(b)
        if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir
        return (Number(va) - Number(vb)) * dir
      })
    : items

  return (
    <table className={`tbl ${s.table} ${editable ? '' : s.readOnly}`} style={{ tableLayout: 'fixed' }}>
      <thead>
        <tr>
          <th className={s.sortable} onClick={() => toggleSort('nombre')}>
            Activo{sortInd('nombre')}
          </th>
          {extra && (
            <th className={s.sortable} onClick={() => toggleSort('extra')}>
              {extra.label}
              {sortInd('extra')}
            </th>
          )}
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
          {editable && <th className={s.center}>Acciones</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map((i) => (
          <tr key={i.id} onClick={editable ? () => onEdit?.(i) : undefined}>
            <td data-label="Activo">
              <span
                className={s.dot}
                style={{ background: i.categoriaColor ?? 'var(--gray)', marginRight: 8 }}
              />
              {nombre(i)}
            </td>
            {extra && (
              <td data-label={extra.label} className={s.muted}>
                {extra.value(i)}
              </td>
            )}
            <td data-label="Aportado" className={s.center}>
              {formatEur(i.capitalAportado, true)}
            </td>
            <td data-label="Valor actual" className={s.center}>
              {formatEur(i.capitalTotal, true)}
            </td>
            <td
              data-label="Plusvalía"
              className={s.center}
              style={{ color: Number(i.plusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
            >
              {formatEur(i.plusvalia, true)}
            </td>
            <td
              data-label="%"
              className={s.center}
              style={{ color: Number(i.porcentajePlusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
            >
              {formatPct(i.porcentajePlusvalia)}
            </td>
{editable && (
            <td data-label="Acciones" className={s.center}>
              <div className={s.rowActions}>
                <IconButton
                  icon="edit"
                  label={`Editar ${nombre(i)}`}
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit?.(i)
                  }}
                />
                <IconButton
                  icon="delete"
                  label={`Eliminar ${nombre(i)}`}
                  danger
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(i)
                  }}
                />
              </div>
            </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
