import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  useActualizarTransaccion,
  useCategorias,
  useCrearCategoria,
  useCrearTransaccion,
  useEliminarTransaccion,
  useMovimientosPaginados,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import type { CuentaResponse, Movimiento, TipoMovimiento } from '@/types/api'
import s from '@/pages/Movimientos.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const today = () => new Date().toISOString().slice(0, 10)

const SIZE = 20
type SortField =
  | 'fechaTransaccion'
  | 'importe'
  | 'categoria.nombreCategoria'
  | 'tipoMovimiento'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const NOW = new Date()
const CUR_MES = String(NOW.getMonth() + 1).padStart(2, '0')
const CUR_ANIO = String(NOW.getFullYear())
// Años seleccionables: el actual y los 6 anteriores.
const ANIOS = Array.from({ length: 7 }, (_, i) => String(NOW.getFullYear() - i))
const TIPOS: TipoMovimiento[] = ['GASTO', 'INGRESO']
const TIPO_LABEL: Record<TipoMovimiento, string> = { GASTO: 'Gasto', INGRESO: 'Ingreso', INVERSION: 'Inversión' }
const BADGE: Record<TipoMovimiento, string> = { GASTO: 'bGasto', INGRESO: 'bIngreso', INVERSION: 'bInversion' }
const esNegativo = (t: TipoMovimiento) => t === 'GASTO' || t === 'INVERSION'

type Mode = 'nueva' | 'actualizar'
const EMPTY = { tipo: 'GASTO' as TipoMovimiento, catName: '', importe: '', descripcion: '', fecha: today() }

interface Props { cuenta: CuentaResponse; onBack: () => void }

export default function AccountMovimientos({ cuenta, onBack }: Props) {
  const { data: categorias } = useCategorias()
  const confirm = useConfirm()
  const crear = useCrearTransaccion()
  const actualizar = useActualizarTransaccion()
  const eliminar = useEliminarTransaccion()
  const crearCategoria = useCrearCategoria()

  // Filtros, orden y paginación (server-side, acotado a esta cuenta)
  const [fTipo, setFTipo] = useState<'TODOS' | TipoMovimiento>('TODOS')
  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState<SortField>('fechaTransaccion')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [mode, setMode] = useState<Mode>('nueva')
  const [selId, setSelId] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  const catsDelTipo = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === form.tipo),
    [categorias, form.tipo],
  )

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const query = useMovimientosPaginados({
    page,
    size: SIZE,
    sort: `${sortField},${sortDir}`,
    cuentaId: cuenta.id,
    tipo: fTipo === 'TODOS' ? undefined : fTipo,
    anio: fAnio === '' ? undefined : Number(fAnio),
    mes: fMes === '' ? undefined : Number(fMes),
    q: q || undefined,
  })

  const data = query.data
  const rows = data?.contenido ?? []
  const totalPaginas = data?.totalPaginas ?? 0
  const totalElementos = data?.totalElementos ?? 0
  const ingresos = data?.ingresos ?? 0
  const gastos = data?.gastos ?? 0
  const diferencia = data?.diferencia ?? 0

  function cambiarFiltro(fn: () => void) {
    fn()
    setPage(0)
  }
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
    setPage(0)
  }
  function sortInd(field: SortField) {
    const active = sortField === field
    return (
      <span className={s.sortArrow} data-active={active ? 'true' : undefined}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    )
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErr(null)
  }

  function resetForm() {
    setSelId('')
    setForm({ ...EMPTY })
    setErr(null)
  }
  function switchMode(m: Mode) {
    setMode(m)
    resetForm()
  }
  // Clic en una fila del historial → abre "Actualizar" con esa transacción cargada.
  function startEdit(m: Movimiento) {
    setMode('actualizar')
    setSelId(String(m.id))
    setErr(null)
    setForm({
      tipo: m.tipoMovimiento,
      catName: m.categoriaNombre ?? '',
      importe: m.importe != null ? String(Math.abs(m.importe)) : '',
      descripcion: m.descripcion ?? '',
      fecha: m.fechaTransaccion ?? today(),
    })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  async function handleDelete() {
    if (!selId) return
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: '¿Seguro que quieres eliminar este movimiento? No se puede deshacer.',
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync({ cuentaId: cuenta.id, id: Number(selId) })
      notifyOk('Movimiento eliminado')
      resetForm()
    } catch (err) {
      notifyError(err)
    }
  }

  async function resolverCategoriaId(name: string): Promise<number> {
    const existing = catsDelTipo.find((c) => c.nombre.toLowerCase() === name.trim().toLowerCase())
    if (existing) return existing.id
    const created = await crearCategoria.mutateAsync({ nombre: name.trim(), tipo: form.tipo })
    return created.id
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const importe = num(form.importe)
    const catName = form.catName.trim()
    if (mode === 'actualizar' && !selId) {
      notifyError('Selecciona una transacción del historial.')
      return
    }
    if (!catName) return setErr({ field: 'catName', msg: 'Indica una categoría.' })
    if (Number.isNaN(importe) || importe <= 0)
      return setErr({ field: 'importe', msg: 'El importe debe ser mayor que 0.' })
    if (!form.fecha) return setErr({ field: 'fecha', msg: 'Indica la fecha.' })
    try {
      const categoriaId = await resolverCategoriaId(catName)
      const dto = { tipoMovimiento: form.tipo, categoriaId, importe, descripcion: form.descripcion.trim() || undefined, fecha: form.fecha }
      if (mode === 'actualizar') {
        await actualizar.mutateAsync({ cuentaId: cuenta.id, id: Number(selId), ...dto })
        notifyOk('Transacción actualizada')
      } else {
        await crear.mutateAsync({ cuentaId: cuenta.id, ...dto })
        notifyOk('Transacción añadida')
      }
      resetForm()
    } catch (error) {
      notifyError(error)
    }
  }

  const saving = crear.isPending || actualizar.isPending || crearCategoria.isPending || eliminar.isPending
  const tipoOptions: TipoMovimiento[] = form.tipo === 'INVERSION' ? [...TIPOS, 'INVERSION'] : TIPOS

  if (query.isLoading && !data) {
    return (
      <div>
        <div className={s.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Skeleton width={180} height={24} />
            <Skeleton width={200} height={13} style={{ marginTop: 6 }} />
          </div>
          <Skeleton width={90} height={32} radius="var(--r-md)" />
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
          <Skeleton width={140} height={13} style={{ marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={34} style={{ marginBottom: 8 }} />
          ))}
        </div>
      </div>
    )
  }
  if (query.isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(query.error)}</p>

  return (
    <div>
      <div className={s.header} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div><h1 style={{ marginBottom: 0 }}>{cuenta.nombreCuenta}</h1><p style={{ marginTop: 2 }}>Movimientos de esta cuenta</p></div>
        <button type="button" className={s.btnGhost} onClick={onBack}>← Cuentas</button>
      </div>
      <div className={s.kpis}>
        <div className={s.kpi}><div className={s.kpiLabel}>Saldo actual</div><div className={s.kpiValue}>{formatEur(cuenta.importe)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Ingresos</div><div className={s.kpiValue} style={{ color: 'var(--up)' }}>{formatEur(ingresos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Gastos</div><div className={s.kpiValue} style={{ color: 'var(--down)' }}>{formatEur(gastos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Diferencia</div><div className={s.kpiValue} style={{ color: diferencia >= 0 ? 'var(--up)' : 'var(--down)' }}>{formatEur(diferencia)}</div></div>
      </div>
      <div className={`card ${s.cardBlock}`}>
        <div className={s.cardHead}>
          <div className="sec-title" style={{ marginBottom: 0 }}>Historial ({totalElementos})</div>
          <div className={s.filters}>
            <div className={s.filterSelect}>
              <Select
                value={fTipo}
                options={[
                  { value: 'TODOS', label: 'Todos los tipos' },
                  ...TIPOS.map((t) => ({ value: t, label: TIPO_LABEL[t] })),
                ]}
                onChange={(v) => cambiarFiltro(() => setFTipo(v))}
                ariaLabel="Filtrar por tipo"
              />
            </div>
            <div className={s.filterSelect}>
              <Select
                value={fMes}
                options={[
                  { value: '', label: 'Todos los meses' },
                  ...MESES.map((mes, idx) => ({
                    value: String(idx + 1).padStart(2, '0'),
                    label: mes,
                  })),
                ]}
                onChange={(v) => cambiarFiltro(() => setFMes(v))}
                ariaLabel="Filtrar por mes"
              />
            </div>
            <div className={s.filterSelect}>
              <Select
                value={fAnio}
                options={[
                  { value: '', label: 'Todos los años' },
                  ...ANIOS.map((y) => ({ value: y, label: y })),
                ]}
                onChange={(v) => cambiarFiltro(() => setFAnio(v))}
                ariaLabel="Filtrar por año"
              />
            </div>
            <input type="text" placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {rows.length === 0 ? (
          <p className={s.empty}>No hay movimientos con estos filtros.</p>
        ) : (
          <table className={s.movTable} style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className={s.sortable} onClick={() => toggleSort('fechaTransaccion')}>
                  Fecha{sortInd('fechaTransaccion')}
                </th>
                <th>Descripción</th>
                <th className={s.sortable} onClick={() => toggleSort('categoria.nombreCategoria')}>
                  Categoría{sortInd('categoria.nombreCategoria')}
                </th>
                <th className={s.sortable} onClick={() => toggleSort('tipoMovimiento')}>
                  Tipo{sortInd('tipoMovimiento')}
                </th>
                <th className={s.sortable} onClick={() => toggleSort('importe')}>
                  Importe{sortInd('importe')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} onClick={() => startEdit(m)}>
                  <td>{m.fechaTransaccion ?? '—'}</td>
                  <td>{m.descripcion || '—'}</td>
                  <td>{m.categoriaNombre ?? '—'}</td>
                  <td><span className={`${s.badge} ${s[BADGE[m.tipoMovimiento]]}`}>{TIPO_LABEL[m.tipoMovimiento]}</span></td>
                  <td className={s.amount} style={{ color: esNegativo(m.tipoMovimiento) ? 'var(--down)' : 'var(--up)' }}>{esNegativo(m.tipoMovimiento) ? '−' : '+'}{formatEur(Math.abs(m.importe), true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalElementos > 0 && (
          <div className={s.pager}>
            <span className={s.pagerInfo}>
              {totalElementos} movimiento{totalElementos === 1 ? '' : 's'} · página {page + 1} de {Math.max(1, totalPaginas)}
            </span>
            <div className={s.pagerBtns}>
              <button type="button" className={s.pageBtn} disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</button>
              <button type="button" className={s.pageBtn} disabled={page >= totalPaginas - 1} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
      <div className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button type="button" className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`} onClick={() => switchMode('nueva')}>Nueva transacción</button>
          <button type="button" className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`} onClick={() => switchMode('actualizar')}>Actualizar</button>
        </div>
        <form onSubmit={submit} noValidate>
          {mode === 'actualizar' && !selId && (
            <p className={s.hint}>Haz clic en una fila del historial para editarla o eliminarla.</p>
          )}

          {(mode === 'nueva' || selId) && (
            <>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Tipo</label>
                  <Select
                    value={form.tipo}
                    options={tipoOptions.map((t) => ({ value: t, label: TIPO_LABEL[t] }))}
                    onChange={(v) => {
                      set('tipo', v)
                      set('catName', '')
                    }}
                    ariaLabel="Tipo"
                  />
                </div>
                <div className={s.field}>
                  <label>Categoría</label>
                  <CategoriaSelect
                    value={form.catName}
                    categorias={catsDelTipo}
                    invalid={err?.field === 'catName'}
                    onChange={(v) => set('catName', v)}
                  />
                  {fieldErr('catName')}
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}><label>Importe (€)</label><input type="number" step="0.01" min="0" placeholder="0,00" value={form.importe} aria-invalid={err?.field === 'importe'} onChange={(e) => set('importe', e.target.value)} />{fieldErr('importe')}</div>
                <div className={s.field}><label>Fecha</label><input type="date" value={form.fecha} aria-invalid={err?.field === 'fecha'} onChange={(e) => set('fecha', e.target.value)} />{fieldErr('fecha')}</div>
                <div className={s.field}><label>Descripción</label><input type="text" placeholder="Opcional" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} /></div>
              </div>
              <p className={s.hint}>
                Si la categoría no existe, se crea automáticamente con el tipo elegido. También puedes hacer clic en una fila del historial para editarla.
              </p>
              <div className={s.actions} style={{ marginTop: 4 }}>
                <button className={s.btn} type="submit" disabled={saving}>{saving ? 'Guardando…' : mode === 'nueva' ? 'Añadir transacción' : 'Guardar cambios'}</button>
                {mode === 'actualizar' && selId && (
                  <button type="button" onClick={handleDelete} disabled={saving} style={{ padding: '9px 16px', fontSize: 14, fontWeight: 600, background: 'transparent', color: 'var(--down)', border: '1px solid var(--down)', borderRadius: 'var(--r-md)', cursor: 'pointer' }}>Eliminar</button>
                )}
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
