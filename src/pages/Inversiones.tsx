import { useMemo, useState, type FormEvent } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  useActualizarInversion,
  useCategorias,
  useCrearCategoria,
  useCrearInversion,
  useEliminarInversion,
  useInversiones,
  useInversionTotales,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Modal from '@/components/ui/Modal'
import IconButton from '@/components/ui/IconButton'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct, currencySymbol } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import MoneyInput from '@/components/ui/MoneyInput'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import s from './Inversiones.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

/** Ids de los formularios de cada modal: el botón de guardar vive en el footer. */
const FORM_NUEVA = 'form-inversion-nueva'
const FORM_EDITAR = 'form-inversion-editar'

type SortField = 'categoria' | 'aportado' | 'total' | 'plusvalia' | 'pct'

export default function Inversiones() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: inversiones, isLoading, isError, error } = useInversiones()
  const { data: categorias } = useCategorias()
  const {
    importeTotal: totalInvertido,
    aportadoTotal: totalAportado,
    plusvaliaTotal,
    porcentajeTotal: rentabilidad,
    isLoading: totalesLoading,
  } = useInversionTotales()

  const crearInversion = useCrearInversion()
  const actualizarInversion = useActualizarInversion()
  const eliminarInversion = useEliminarInversion()
  const crearCategoria = useCrearCategoria()

  const invCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'INVERSION'),
    [categorias],
  )

  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  // Modal de nueva inversión
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [aportado, setAportado] = useState('')
  const [total, setTotal] = useState('')

  // Modal de edición: updId null = cerrado
  const [updId, setUpdId] = useState<number | null>(null)
  const [updAportacion, setUpdAportacion] = useState('')
  const [updValor, setUpdValor] = useState('')

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function abrirNueva() {
    setCatName('')
    setAportado('')
    setTotal('')
    setErr(null)
    setNuevaOpen(true)
  }

  function cerrarNueva() {
    setNuevaOpen(false)
    setErr(null)
  }

  function abrirEditar(id: number) {
    setUpdId(id)
    setUpdAportacion('')
    setUpdValor('')
    setErr(null)
  }

  function cerrarEditar() {
    setUpdId(null)
    setUpdAportacion('')
    setUpdValor('')
    setErr(null)
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

  if (isLoading || totalesLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={160} height={26} />
          <Skeleton width={360} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className={s.kpis}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className={`card ${s.cardBlock}`}>
          <Skeleton width={130} height={13} style={{ marginBottom: 16 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              width="100%"
              height={34}
              style={{ marginBottom: 8 }}
            />
          ))}
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const list = inversiones ?? []
  const sorted = sortField
    ? [...list].sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1
        const key = (i: (typeof list)[number]): number | string => {
          switch (sortField) {
            case 'categoria':
              return (i.categoriaNombre ?? '').toLowerCase()
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
        const va = key(a)
        const vb = key(b)
        if (typeof va === 'string' && typeof vb === 'string') {
          return va.localeCompare(vb) * dir
        }
        return (Number(va) - Number(vb)) * dir
      })
    : list

  const t = chartTheme()
  const doughnut = {
    labels: list.map((i) => i.categoriaNombre ?? `#${i.id}`),
    datasets: [
      {
        data: list.map((i) => Number(i.capitalTotal || 0)),
        backgroundColor: list.map((_, idx) => PALETTE[idx % PALETTE.length]),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }
  const bar = {
    labels: list.map((i) => i.categoriaNombre ?? `#${i.id}`),
    datasets: [
      {
        label: `Plusvalía (${currencySymbol()})`,
        data: list.map((i) => Number(i.plusvalia || 0)),
        backgroundColor: list.map((i) =>
          Number(i.plusvalia || 0) >= 0 ? '#1d9e75' : '#f85149',
        ),
        borderRadius: 4,
      },
    ],
  }

  async function submitNueva(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const a = num(aportado)
    const tot = num(total)
    const name = catName.trim()
    if (!name) return setErr({ field: 'catName', msg: 'Indica una categoría.' })
    if (Number.isNaN(a) || a <= 0)
      return setErr({ field: 'aportado', msg: 'El capital aportado debe ser mayor que 0.' })
    if (Number.isNaN(tot) || tot < 0)
      return setErr({ field: 'total', msg: 'El valor actual no es válido.' })
    try {
      // Reutiliza la categoría si ya existe (por nombre); si no, la crea.
      const existing = invCats.find(
        (c) => c.nombre.toLowerCase() === name.toLowerCase(),
      )
      const categoriaId =
        existing?.id ??
        (await crearCategoria.mutateAsync({ nombre: name, tipo: 'INVERSION' })).id
      await crearInversion.mutateAsync({
        categoriaId,
        capitalAportado: a,
        capitalTotal: tot,
      })
      notifyOk('Inversión creada')
      cerrarNueva()
    } catch (error) {
      notifyError(error)
    }
  }

  async function submitActualizar(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (updId === null) return
    const ap = num(updAportacion)
    const val = num(updValor)
    const hasAp = !Number.isNaN(ap)
    const hasVal = !Number.isNaN(val)
    if (!hasAp && !hasVal)
      return setErr({
        field: 'updAportacion',
        msg: 'Indica una nueva aportación, un valor actual, o ambos.',
      })
    if (hasAp && ap < 0)
      return setErr({ field: 'updAportacion', msg: 'La aportación no puede ser negativa.' })
    if (hasVal && val < 0)
      return setErr({ field: 'updValor', msg: 'El valor actual no puede ser negativo.' })
    try {
      await actualizarInversion.mutateAsync({
        id: updId,
        ...(hasAp ? { aportacion: ap } : {}),
        ...(hasVal ? { valorActual: val } : {}),
      })
      notifyOk('Inversión actualizada')
      cerrarEditar()
    } catch (error) {
      notifyError(error)
    }
  }

  async function handleDelete(id: number) {
    const inv = list.find((x) => x.id === id)
    const nombre = inv?.categoriaNombre ?? `#${id}`
    const ok = await confirm({
      title: 'Eliminar inversión',
      message: (
        <>
          ¿Seguro que quieres eliminar la inversión <strong>{nombre}</strong>? No
          se puede deshacer.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarInversion.mutateAsync(id)
      notifyOk('Inversión eliminada')
      if (updId === id) cerrarEditar()
    } catch (err) {
      notifyError(err)
    }
  }

  const saving =
    crearInversion.isPending ||
    crearCategoria.isPending ||
    actualizarInversion.isPending ||
    eliminarInversion.isPending

  return (
    <div>

      <StatGrid>
        <StatCard label="Total invertido" value={formatEur(totalInvertido)} />
        <StatCard label="Capital aportado" value={formatEur(totalAportado)} />
        <StatCard
          label="Plusvalía total"
          value={formatEur(plusvaliaTotal)}
          color={plusvaliaTotal >= 0 ? 'var(--up)' : 'var(--down)'}
        />
        <StatCard
          label="Rentabilidad media"
          value={formatPct(rentabilidad)}
          color={rentabilidad >= 0 ? 'var(--up)' : 'var(--down)'}
        />
      </StatGrid>

      {list.length > 0 && (
        <div className={s.charts}>
          <div className="card">
            <div className="sec-title">Distribución por categoría</div>
            <div className={s.chartBox}>
              <Doughnut
                key={`d-${theme}`}
                data={doughnut}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '62%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: t.tick, boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      callbacks: {
                        label: (c) => {
                          const arr = c.dataset.data as number[]
                          const tot = arr.reduce((a, b) => a + Number(b || 0), 0)
                          const pct = tot ? (Number(c.parsed) / tot) * 100 : 0
                          return ` ${c.label}: ${formatEur(c.parsed)} · ${formatPct(pct)}`
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className="card">
            <div className="sec-title">Plusvalía por categoría</div>
            <div className={s.chartBox}>
              <Bar
                key={`b-${theme}`}
                data={bar}
                options={{
                  indexAxis: 'y' as const,
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (c) => {
                          const inv = list[c.dataIndex]
                          return ` Plusvalía: ${formatEur(Number(c.raw))} · ${formatPct(
                            inv ? inv.porcentajePlusvalia : null,
                          )}`
                        },
                      },
                    },
                  },
                  scales: {
                    x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                    y: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`card ${s.cardBlock}`}>
        <div className="block-head">
          <div className="sec-title">Mis inversiones</div>
          <button type="button" className={s.btn} onClick={abrirNueva} disabled={saving}>
            + Añadir inversión
          </button>
        </div>
        {list.length === 0 ? (
          <EmptyState
            message="Aún no tienes inversiones. Crea la primera para seguir su rentabilidad."
            actionLabel="Añadir tu primera inversión"
            onAction={abrirNueva}
          />
        ) : (
          <table className={`tbl ${s.table}`} style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className={s.sortable} onClick={() => toggleSort('categoria')}>
                  Categoría{sortInd('categoria')}
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
                <th className={s.center}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.id} onClick={() => abrirEditar(i.id)}>
                  <td data-label="Categoría">{i.categoriaNombre ?? `#${i.id}`}</td>
                  <td data-label="Aportado" className={s.center}>{formatEur(i.capitalAportado, true)}</td>
                  <td data-label="Valor actual" className={s.center}>{formatEur(i.capitalTotal, true)}</td>
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
                  <td data-label="Acciones" className={s.center}>
                    <div className={s.rowActions}>
                      <IconButton
                        icon="edit"
                        label={`Editar ${i.categoriaNombre ?? 'inversión'}`}
                        disabled={saving}
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirEditar(i.id)
                        }}
                      />
                      <IconButton
                        icon="delete"
                        label={`Eliminar ${i.categoriaNombre ?? 'inversión'}`}
                        danger
                        disabled={saving}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(i.id)
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={nuevaOpen}
        onClose={cerrarNueva}
        maxWidth={520}
        title="Nueva inversión"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarNueva} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_NUEVA} disabled={saving}>
              {saving ? 'Guardando…' : 'Añadir inversión'}
            </button>
          </>
        }
      >
        <form id={FORM_NUEVA} onSubmit={submitNueva} noValidate>
          <div className={s.row}>
            <div className={s.field}>
              <label>Categoría</label>
              <CategoriaSelect
                value={catName}
                categorias={invCats}
                invalid={err?.field === 'catName'}
                onChange={(v) => {
                  setCatName(v)
                  setErr(null)
                }}
              />
              {fieldErr('catName')}
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label>Capital aportado</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={aportado}
                aria-invalid={err?.field === 'aportado'}
                onChange={(e) => {
                  setAportado(e.target.value)
                  setErr(null)
                }}
              />
              {fieldErr('aportado')}
            </div>
            <div className={s.field}>
              <label>Valor actual</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={total}
                aria-invalid={err?.field === 'total'}
                onChange={(e) => {
                  setTotal(e.target.value)
                  setErr(null)
                }}
              />
              {fieldErr('total')}
            </div>
          </div>
          <p className={s.hint}>
            Si la categoría no existe, se crea automáticamente (tipo Inversión).
          </p>
        </form>
      </Modal>

      <Modal
        open={updId !== null}
        onClose={cerrarEditar}
        maxWidth={520}
        title={`Actualizar ${list.find((i) => i.id === updId)?.categoriaNombre ?? 'inversión'}`}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarEditar} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_EDITAR} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <form id={FORM_EDITAR} onSubmit={submitActualizar} noValidate>
          <div className={s.row}>
            <div className={s.field}>
              <label>Nueva aportación</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="Opcional"
                value={updAportacion}
                aria-invalid={err?.field === 'updAportacion'}
                onChange={(e) => {
                  setUpdAportacion(e.target.value)
                  setErr(null)
                }}
              />
              {fieldErr('updAportacion')}
            </div>
            <div className={s.field}>
              <label>Valor actual</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={updValor}
                aria-invalid={err?.field === 'updValor'}
                onChange={(e) => {
                  setUpdValor(e.target.value)
                  setErr(null)
                }}
              />
              {fieldErr('updValor')}
            </div>
          </div>
          <p className={s.hint}>
            La aportación se suma al capital; el valor actual fija el total del momento
            (la plusvalía se calcula sola).
          </p>
        </form>
      </Modal>
    </div>
  )
}
