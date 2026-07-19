import { useMemo, useRef, useState, type FormEvent } from 'react'
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
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import s from './Inversiones.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

type Mode = 'nueva' | 'actualizar'
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
  } = useInversionTotales()

  const crearInversion = useCrearInversion()
  const actualizarInversion = useActualizarInversion()
  const eliminarInversion = useEliminarInversion()
  const crearCategoria = useCrearCategoria()

  const invCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'INVERSION'),
    [categorias],
  )

  const [mode, setMode] = useState<Mode>('nueva')
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  // Nueva inversión
  const [catName, setCatName] = useState('')
  const [aportado, setAportado] = useState('')
  const [total, setTotal] = useState('')

  // Actualizar
  const [updId, setUpdId] = useState('')
  const [updAportacion, setUpdAportacion] = useState('')
  const [updValor, setUpdValor] = useState('')

  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const formRef = useRef<HTMLDivElement>(null)
  function irAlFormulario() {
    setMode('nueva')
    setErr(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
      350,
    )
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

  if (isLoading) {
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
        label: 'Plusvalía (€)',
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
      setCatName('')
      setAportado('')
      setTotal('')
    } catch (error) {
      notifyError(error)
    }
  }

  async function submitActualizar(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!updId) return setErr({ field: 'updId', msg: 'Selecciona una inversión.' })
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
        id: Number(updId),
        ...(hasAp ? { aportacion: ap } : {}),
        ...(hasVal ? { valorActual: val } : {}),
      })
      notifyOk('Inversión actualizada')
      setUpdAportacion('')
      setUpdValor('')
    } catch (error) {
      notifyError(error)
    }
  }

  function selectInversion(id: number) {
    setMode('actualizar')
    setUpdId(String(id))
    setUpdAportacion('')
    setUpdValor('')
    setErr(null)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  async function handleDelete() {
    if (!updId) return
    const inv = list.find((x) => x.id === Number(updId))
    const nombre = inv?.categoriaNombre ?? `#${updId}`
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
      await eliminarInversion.mutateAsync(Number(updId))
      notifyOk('Inversión eliminada')
      setUpdId('')
      setUpdAportacion('')
      setUpdValor('')
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
      <div className={s.header}>
        <h1>Inversiones</h1>
        <p>Controla en qué categorías estás invirtiendo y su rentabilidad</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total invertido</div>
          <div className={s.kpiValue}>{formatEur(totalInvertido)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Capital aportado</div>
          <div className={s.kpiValue}>{formatEur(totalAportado)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Plusvalía total</div>
          <div
            className={s.kpiValue}
            style={{ color: plusvaliaTotal >= 0 ? 'var(--up)' : 'var(--down)' }}
          >
            {formatEur(plusvaliaTotal)}
          </div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Rentabilidad media</div>
          <div
            className={s.kpiValue}
            style={{ color: rentabilidad >= 0 ? 'var(--up)' : 'var(--down)' }}
          >
            {formatPct(rentabilidad)}
          </div>
        </div>
      </div>

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
        <div className="sec-title">Mis inversiones</div>
        {list.length === 0 ? (
          <EmptyState
            message="Aún no tienes inversiones. Crea la primera para seguir su rentabilidad."
            actionLabel="Añadir tu primera inversión"
            onAction={irAlFormulario}
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
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.id} onClick={() => selectInversion(i.id)}>
                  <td>{i.categoriaNombre ?? `#${i.id}`}</td>
                  <td className={s.center}>{formatEur(i.capitalAportado, true)}</td>
                  <td className={s.center}>{formatEur(i.capitalTotal, true)}</td>
                  <td
                    className={s.center}
                    style={{ color: Number(i.plusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
                  >
                    {formatEur(i.plusvalia, true)}
                  </td>
                  <td
                    className={s.center}
                    style={{ color: Number(i.porcentajePlusvalia) >= 0 ? 'var(--up)' : 'var(--down)' }}
                  >
                    {formatPct(i.porcentajePlusvalia)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div ref={formRef} className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`}
            onClick={() => {
              setMode('nueva')
              setErr(null)
            }}
          >
            Nueva inversión
          </button>
          <button
            type="button"
            className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`}
            onClick={() => {
              setMode('actualizar')
              setErr(null)
            }}
          >
            Actualizar
          </button>
        </div>

        {mode === 'nueva' ? (
          <form onSubmit={submitNueva} noValidate>
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
              <div className={s.field}>
                <label>Capital aportado (€)</label>
                <input
                  type="number"
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
                <label>Valor actual (€)</label>
                <input
                  type="number"
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
            <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
              {saving ? 'Guardando…' : 'Añadir inversión'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitActualizar} noValidate>
            {list.length === 0 ? (
              <p className={s.hint}>No tienes inversiones que actualizar todavía.</p>
            ) : (
              <>
                <div className={s.row}>
                  <div className={s.field}>
                    <label>Categoría</label>
                    <Select
                      value={updId}
                      options={list.map((i) => ({
                        value: String(i.id),
                        label: i.categoriaNombre ?? `#${i.id}`,
                      }))}
                      placeholder="Selecciona"
                      invalid={err?.field === 'updId'}
                      onChange={(v) => {
                        setUpdId(v)
                        setErr(null)
                      }}
                    />
                    {fieldErr('updId')}
                  </div>
                  <div className={s.field}>
                    <label>Nueva aportación (€)</label>
                    <input
                      type="number"
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
                    <label>Valor actual (€)</label>
                    <input
                      type="number"
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
                  La aportación se suma al capital; el valor actual fija el total del momento (la plusvalía se calcula sola).
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  <button className={s.btn} type="submit" disabled={saving}>
                    {saving ? 'Guardando…' : 'Actualizar inversión'}
                  </button>
                  {updId && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      style={{
                        padding: '9px 16px',
                        fontSize: 14,
                        fontWeight: 600,
                        background: 'transparent',
                        color: 'var(--down)',
                        border: '1px solid var(--down)',
                        borderRadius: 'var(--r-md)',
                        cursor: 'pointer',
                      }}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
