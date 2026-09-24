import { useMemo, useState, type FormEvent } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  useActualizarRecurrente,
  useCategorias,
  useCrearCategoria,
  useCrearRecurrente,
  useEliminarRecurrente,
  useNuevoPrecioRecurrente,
  useRecurrentes,
  useResumenRecurrente,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Modal from '@/components/ui/Modal'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur, currencySymbol } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import Toggle from '@/components/ui/Toggle'
import { Tabs } from '@/components/ui/Tabs'
import type { Frecuencia, GastoRecurrenteResponse, TipoImporte } from '@/types/api'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import s from './Recurrentes.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const today = () => new Date().toISOString().slice(0, 10)

/** Id del formulario del modal: permite que el botón de guardar viva en el footer. */
const FORM_ID = 'form-recurrente'
const FORM_MES_ID = 'form-importe-mes'
const FORM_PRECIO_ID = 'form-nuevo-precio'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const claveMes = (anio: number, mes: number) => `${anio}-${String(mes + 1).padStart(2, '0')}`

/** Importe registrado por mes ('YYYY-MM' → importe). Si un mes tuviera varios, gana el más reciente. */
function importesPorMes(rec: GastoRecurrenteResponse): Map<string, number> {
  const mapa = new Map<string, number>()
  ;[...rec.historial]
    .sort((a, b) => a.fechaVariacionImporte.localeCompare(b.fechaVariacionImporte) || a.id - b.id)
    .forEach((h) => mapa.set(h.fechaVariacionImporte.slice(0, 7), Number(h.importe || 0)))
  return mapa
}

/**
 * Importe que se cobra en un mes (mismo criterio que el back):
 * - Fijos: el precio en vigor el día de cobro de ese mes.
 * - Variables: solo el apuntado para ese mes; sin importe, 0.
 * Sin historial, el importe actual.
 */
function importeEnMes(rec: GastoRecurrenteResponse, anio: number, mes: number): number {
  if (rec.tipoImporte === 'VARIABLE') return importesPorMes(rec).get(claveMes(anio, mes)) ?? 0
  const ordenado = [...rec.historial].sort(
    (a, b) => a.fechaVariacionImporte.localeCompare(b.fechaVariacionImporte) || a.id - b.id,
  )
  if (ordenado.length === 0) return Number(rec.importeActual || 0)
  const previos = ordenado.filter((h) => h.fechaVariacionImporte <= fechaCobro(rec, anio, mes))
  const elegido = previos.length ? previos[previos.length - 1] : ordenado[0]
  return Number(elegido.importe || 0)
}

/** Precio con el que se dio de alta: el primero del historial (por fecha, luego id). */
function precioInicial(rec: GastoRecurrenteResponse): number | null {
  if (rec.historial.length === 0) return rec.importeActual
  const primero = [...rec.historial].sort(
    (a, b) => a.fechaVariacionImporte.localeCompare(b.fechaVariacionImporte) || a.id - b.id,
  )[0]
  return Number(primero.importe)
}

/** Fecha del cobro de ese mes: el día ancla del primer pago, recortado a la longitud del mes. */
function fechaCobro(rec: GastoRecurrenteResponse, anio: number, mes: number) {
  const dia = rec.fechaPrimerPago ? Number(rec.fechaPrimerPago.slice(8, 10)) : 1
  const ultimo = new Date(anio, mes + 1, 0).getDate()
  return `${claveMes(anio, mes)}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}

const EMPTY = {
  nombre: '',
  catName: '',
  frecuencia: 'MENSUAL' as Frecuencia,
  tipoImporte: 'FIJO' as TipoImporte,
  importe: '',
  fechaPrimerPago: today(),
}

export default function Recurrentes() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: recurrentesData, isLoading, isError, error } = useRecurrentes()
  const { data: resumen, isLoading: resumenLoading } = useResumenRecurrente('RECURRENTE')
  const { data: categorias } = useCategorias()

  const crearRecurrente = useCrearRecurrente()
  const actualizarRecurrente = useActualizarRecurrente()
  const nuevoPrecio = useNuevoPrecioRecurrente()
  const eliminarRecurrente = useEliminarRecurrente()
  const crearCategoria = useCrearCategoria()

  const gastoCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'GASTO'),
    [categorias],
  )

  // Formulario en modal: editId null = alta, número = edición de ese gasto.
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null
  const [detail, setDetail] = useState<GastoRecurrenteResponse | null>(null)
  const [detailTab, setDetailTab] = useState<'precio' | 'periodos'>('precio')
  // Filtros de la lista: por tipo de importe y por frecuencia, combinables.
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | TipoImporte>('TODOS')
  const [filtroFrec, setFiltroFrec] = useState<'TODAS' | Frecuencia>('TODAS')
  // Modal «Importe del mes» (solo variables): mes elegido + importe.
  const hoy = new Date()
  const [mesRec, setMesRec] = useState<GastoRecurrenteResponse | null>(null)
  const [mesAnio, setMesAnio] = useState(hoy.getFullYear())
  const [mesSel, setMesSel] = useState({ anio: hoy.getFullYear(), mes: hoy.getMonth() })
  const [mesImporte, setMesImporte] = useState('')
  const [mesErr, setMesErr] = useState<string | null>(null)
  // Modal «Nuevo precio» (solo fijos): importe nuevo + fecha del cambio.
  const [precioRec, setPrecioRec] = useState<GastoRecurrenteResponse | null>(null)
  const [precioImporte, setPrecioImporte] = useState('')
  const [precioFecha, setPrecioFecha] = useState(today())
  const [precioErr, setPrecioErr] = useState<{ field: string; msg: string } | null>(null)

  if (isLoading || resumenLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={200} height={26} />
          <Skeleton width={280} height={14} style={{ marginTop: 8 }} />
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
          <Skeleton width={180} height={13} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={260} height={150} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const recs = (recurrentesData ?? []).filter((r) => r.tipoPago === 'RECURRENTE')
  const activos = recs.filter((r) => r.active)
  // Si un gasto antiguo llegara sin tipo, se trata como fijo (igual que el backend).
  const recsFiltrados = recs.filter((r) => filtroFrec === 'TODAS' || r.frecuencia === filtroFrec)
  const fijos = recsFiltrados.filter((r) => r.tipoImporte !== 'VARIABLE')
  const variables = recsFiltrados.filter((r) => r.tipoImporte === 'VARIABLE')
  const verFijos = filtroTipo !== 'VARIABLE'
  const verVariables = filtroTipo !== 'FIJO'
  const sufijoFrec = filtroFrec === 'MENSUAL' ? ' mensuales' : filtroFrec === 'ANUAL' ? ' anuales' : ''
  const gastoMensual = resumen?.gastoMensual ?? 0
  const gastoMensualFijo = resumen?.gastoMensualFijo ?? 0
  const gastoMensualVariable = resumen?.gastoMensualVariable ?? 0
  const gastoAnual = resumen?.gastoAnual ?? 0
  const numActivos = resumen?.activos ?? activos.length
  const numTotal = resumen?.total ?? recs.length

  // Gasto real por mes: los mensuales cuentan cada mes; cada anual cae en el mes de su pago.
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const porMesMensual: number[] = new Array(12).fill(0)
  const porMesAnual: number[] = new Array(12).fill(0)
  const anualesPorMes: string[][] = Array.from({ length: 12 }, () => [])
  // Cada mes con su propio importe (en los variables puede cambiar mes a mes).
  const anioGrafica = new Date().getFullYear()
  activos.forEach((r) => {
    if (r.frecuencia === 'MENSUAL') {
      for (let m = 0; m < 12; m++) porMesMensual[m] += importeEnMes(r, anioGrafica, m)
    } else {
      const fecha = r.fechaProximoPago ?? r.fechaPrimerPago
      if (fecha) {
        const m = Number(fecha.slice(5, 7)) - 1
        if (m >= 0 && m < 12) {
          porMesAnual[m] += importeEnMes(r, anioGrafica, m)
          anualesPorMes[m].push(r.nombre)
        }
      }
    }
  })

  const t = chartTheme()
  const monthlyBar = {
    labels: MESES,
    datasets: [
      { label: 'Mensuales', data: porMesMensual, backgroundColor: '#2f81f7', borderRadius: 4, stack: 'g' },
      { label: 'Anual', data: porMesAnual, backgroundColor: '#d29922', borderRadius: 4, stack: 'g' },
    ],
  }

  const hist = detail?.historial ?? []
  // Del más reciente al más antiguo: la última alta es la que suele interesar.
  const periodos = [...(detail?.periodos ?? [])].reverse()
  const changes = hist.slice(1).map((h, i) => {
    const antes = Number(hist[i].importe || 0)
    const despues = Number(h.importe || 0)
    return { fecha: h.fechaVariacionImporte, antes, despues, diff: despues - antes }
  })
  const lineData = {
    labels: hist.map((h) => h.fechaVariacionImporte),
    datasets: [
      {
        label: `Precio (${currencySymbol()})`,
        data: hist.map((h) => Number(h.importe || 0)),
        borderColor: '#2f81f7',
        backgroundColor: 'rgba(47, 129, 247, 0.15)',
        fill: true,
        tension: 0.2,
        pointRadius: 4,
        pointBackgroundColor: '#2f81f7',
      },
    ],
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setErr(null)
  }

  function abrirNueva() {
    setEditId(null)
    setForm({ ...EMPTY })
    setErr(null)
    setFormOpen(true)
  }

  /** El detalle siempre se abre por la pestaña de precios. */
  function abrirDetalle(rec: GastoRecurrenteResponse) {
    setDetailTab('precio')
    setDetail(rec)
  }

  function abrirEditar(rec: GastoRecurrenteResponse) {
    setEditId(rec.id)
    setForm({
      nombre: rec.nombre,
      catName: rec.categoriaNombre ?? '',
      frecuencia: rec.frecuencia,
      tipoImporte: rec.tipoImporte ?? 'FIJO',
      // Al editar, el campo es el precio del ALTA (primero del historial), para corregirlo.
      importe: String(precioInicial(rec) ?? ''),
      fechaPrimerPago: rec.fechaPrimerPago ?? today(),
    })
    setErr(null)
    setFormOpen(true)
  }

  function cerrarForm() {
    setFormOpen(false)
    setEditId(null)
    setErr(null)
    setForm({ ...EMPTY })
  }

  async function resolverCategoriaId(name: string): Promise<number> {
    const existing = gastoCats.find((c) => c.nombre.toLowerCase() === name.toLowerCase())
    if (existing) return existing.id
    const created = await crearCategoria.mutateAsync({ nombre: name, tipo: 'GASTO' })
    return created.id
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const nombre = form.nombre.trim()
    const catName = form.catName.trim()
    const importe = num(form.importe)
    if (!nombre) return setErr({ field: 'nombre', msg: 'Indica el nombre del gasto recurrente.' })
    if (!catName) return setErr({ field: 'catName', msg: 'Indica una categoría.' })
    if (Number.isNaN(importe) || importe <= 0)
      return setErr({ field: 'importe', msg: 'El importe debe ser mayor que 0.' })
    if (!form.fechaPrimerPago)
      return setErr({ field: 'fechaPrimerPago', msg: 'Indica la fecha del primer pago.' })

    try {
      const categoriaId = await resolverCategoriaId(catName)
      if (editId === null) {
        await crearRecurrente.mutateAsync({
          nombre,
          categoriaId,
          tipoPago: 'RECURRENTE',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          importeInicial: importe,
          tipoImporte: form.tipoImporte,
        })
      } else {
        const rec = recs.find((x) => x.id === editId)
        await actualizarRecurrente.mutateAsync({
          id: editId,
          nombre,
          categoriaId,
          tipoPago: 'RECURRENTE',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          // El alta/baja se maneja con el interruptor de la tarjeta, no aquí.
          active: rec?.active ?? true,
          tipoImporte: form.tipoImporte,
          // Solo se manda si cambia: corrige el precio del alta, no crea un cambio de precio.
          importeInicial: rec && precioInicial(rec) !== importe ? importe : undefined,
        })
      }
      notifyOk(editId === null ? 'Gasto recurrente creado' : 'Gasto recurrente actualizado')
      cerrarForm()
    } catch (error) {
      notifyError(error)
    }
  }

  /**
   * Alta/baja desde la tarjeta. El backend es quien sella la fecha de baja al
   * desactivar y reinicia la de primer pago al reactivar; aquí solo se manda el
   * resto de campos sin tocar.
   */
  async function toggleActivo(rec: GastoRecurrenteResponse, active: boolean) {
    try {
      await actualizarRecurrente.mutateAsync({
        id: rec.id,
        nombre: rec.nombre,
        categoriaId: rec.categoriaId!,
        tipoPago: 'RECURRENTE',
        frecuencia: rec.frecuencia,
        fechaPrimerPago: rec.fechaPrimerPago ?? today(),
        active,
        tipoImporte: rec.tipoImporte,
      })
      notifyOk(active ? 'Gasto recurrente activado' : 'Gasto recurrente dado de baja')
    } catch (error) {
      notifyError(error)
    }
  }

  async function deleteRec(rec: GastoRecurrenteResponse) {
    const ok = await confirm({
      title: 'Eliminar gasto recurrente',
      message: (
        <>
          ¿Seguro que quieres eliminar <strong>{rec.nombre}</strong>? Esta acción
          no se puede deshacer.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarRecurrente.mutateAsync(rec.id)
      notifyOk('Gasto recurrente eliminado')
      if (editId === rec.id) cerrarForm()
    } catch (err) {
      notifyError(err)
    }
  }

  function abrirImporteMes(rec: GastoRecurrenteResponse) {
    const anio = hoy.getFullYear()
    const mes = hoy.getMonth()
    setMesRec(rec)
    setMesAnio(anio)
    elegirMes(rec, anio, mes)
  }

  function elegirMes(rec: GastoRecurrenteResponse, anio: number, mes: number) {
    setMesSel({ anio, mes })
    const actual = importesPorMes(rec).get(claveMes(anio, mes))
    setMesImporte(actual != null ? String(actual) : '')
    setMesErr(null)
  }

  function cerrarImporteMes() {
    setMesRec(null)
    setMesErr(null)
  }

  async function guardarImporteMes(e: FormEvent) {
    e.preventDefault()
    if (!mesRec) return
    const importe = num(mesImporte)
    if (Number.isNaN(importe) || importe <= 0) return setMesErr('El importe debe ser mayor que 0.')
    try {
      await nuevoPrecio.mutateAsync({
        id: mesRec.id,
        importe,
        fechaVariacionImporte: fechaCobro(mesRec, mesSel.anio, mesSel.mes),
      })
      notifyOk(`Importe de ${MESES_LARGOS[mesSel.mes]} guardado`)
      cerrarImporteMes()
    } catch (error) {
      notifyError(error)
    }
  }

  function abrirNuevoPrecio(rec: GastoRecurrenteResponse) {
    setPrecioRec(rec)
    setPrecioImporte('')
    setPrecioFecha(today())
    setPrecioErr(null)
  }

  function cerrarNuevoPrecio() {
    setPrecioRec(null)
    setPrecioErr(null)
  }

  async function guardarNuevoPrecio(e: FormEvent) {
    e.preventDefault()
    if (!precioRec) return
    const importe = num(precioImporte)
    if (Number.isNaN(importe) || importe <= 0)
      return setPrecioErr({ field: 'importe', msg: 'El importe debe ser mayor que 0.' })
    if (!precioFecha) return setPrecioErr({ field: 'fecha', msg: 'Indica la fecha del cambio.' })
    try {
      await nuevoPrecio.mutateAsync({ id: precioRec.id, importe, fechaVariacionImporte: precioFecha })
      notifyOk('Nuevo precio guardado')
      cerrarNuevoPrecio()
    } catch (error) {
      notifyError(error)
    }
  }

  function renderCard(r: GastoRecurrenteResponse) {
    return (
      <div
        key={r.id}
        className={`${s.recCard} ${r.active ? '' : s.inactive}`}
        onClick={() => abrirDetalle(r)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && abrirDetalle(r)}
      >
        <div className={s.recTop}>
          <div>
            <div className={s.recName}>{r.nombre}</div>
            <div className={s.recCat}>{r.categoriaNombre ?? '—'}</div>
          </div>
          <Toggle
            checked={r.active}
            label={r.active ? 'Activo' : 'Inactivo'}
            ariaLabel={`Gasto recurrente ${r.nombre}: activo o inactivo`}
            disabled={saving}
            onChange={(v) => toggleActivo(r, v)}
          />
        </div>
        <div className={s.recPrice}>
          {formatEur(r.importeActual, true)}{' '}
          <span>/{r.frecuencia === 'ANUAL' ? 'año' : 'mes'}</span>
        </div>
        <div className={s.recMeta}>
          {r.active
            ? `Próximo pago: ${r.fechaProximoPago ?? '—'}`
            : r.fechaUltimoPago
              ? `Último pago: ${r.fechaUltimoPago}`
              : 'Dado de baja sin ningún pago'}
        </div>
        <div className={s.clickHint}>Clic para ver el historial de precios →</div>
        <div className="card-actions">
          {r.tipoImporte === 'VARIABLE' ? (
            <button
              type="button"
              className={s.btnMes}
              onClick={(e) => {
                e.stopPropagation()
                abrirImporteMes(r)
              }}
              disabled={saving}
            >
              Importe del mes
            </button>
          ) : (
            <button
              type="button"
              className={s.btnMes}
              onClick={(e) => {
                e.stopPropagation()
                abrirNuevoPrecio(r)
              }}
              disabled={saving}
            >
              Nuevo precio
            </button>
          )}
          <button
            type="button"
            className="btn-card"
            onClick={(e) => {
              e.stopPropagation()
              abrirEditar(r)
            }}
            disabled={saving}
          >
            Editar
          </button>
          <button
            type="button"
            className={s.cardDeleteBtn}
            onClick={(e) => {
              e.stopPropagation()
              deleteRec(r)
            }}
            disabled={saving}
          >
            Eliminar
          </button>
        </div>
      </div>
    )
  }

  const saving =
    crearRecurrente.isPending ||
    actualizarRecurrente.isPending ||
    nuevoPrecio.isPending ||
    eliminarRecurrente.isPending ||
    crearCategoria.isPending

  return (
    <div>

      <StatGrid>
        <StatCard label="Gasto de este mes" value={formatEur(gastoMensual, true)} />
        <StatCard label="Fijos este mes" value={formatEur(gastoMensualFijo, true)} />
        <StatCard label="Variables este mes" value={formatEur(gastoMensualVariable, true)} />
        <StatCard label={`Gasto anual ${new Date().getFullYear()}`} value={formatEur(gastoAnual)} />
        <StatCard label="Activos" value={numActivos} />
        <StatCard label="Total" value={numTotal} />
      </StatGrid>

      {activos.length > 0 && (
        <div className={s.charts}>
          <div className="card">
            <div className="sec-title">Gasto por mes</div>
            <div className={s.chartBox}>
              <Bar
                key={`m-${theme}`}
                data={monthlyBar}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: t.tick, boxWidth: 12, font: { size: 11 } },
                    },
                    tooltip: {
                      filter: (item) => Number(item.parsed.y || 0) > 0,
                      callbacks: {
                        label: (c) => ` ${c.dataset.label}: ${formatEur(Number(c.parsed.y), true)}`,
                        footer: (items) => {
                          if (!items.length) return ''
                          const total = items.reduce((a, it) => a + Number(it.parsed.y || 0), 0)
                          const m = items[0].dataIndex
                          const lines = [`Total: ${formatEur(total, true)}`]
                          if (anualesPorMes[m].length)
                            lines.push('Pago anual: ' + anualesPorMes[m].join(', '))
                          return lines
                        },
                      },
                    },
                  },
                  scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                    y: { stacked: true, grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                  },
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`card ${s.cardBlock}`}>
        <div className="block-head">
          <div className="sec-title">Mis gastos recurrentes</div>
          <button type="button" className={s.btn} onClick={abrirNueva} disabled={saving}>
            + Añadir recurrente
          </button>
        </div>
        {recs.length === 0 ? (
          <EmptyState
            message="No tienes gastos recurrentes registrados. Añade el primero para ver tu gasto fijo mensual."
            actionLabel="Añadir tu primer recurrente"
            onAction={abrirNueva}
          />
        ) : (
          <>
            <div className={s.filters}>
              <div className={s.filterGroup}>
                <span className={s.filterLabel}>Gastos</span>
                <Tabs
                  value={filtroTipo}
                  onChange={setFiltroTipo}
                  options={[
                    { value: 'TODOS', label: 'Todos' },
                    { value: 'FIJO', label: 'Fijos' },
                    { value: 'VARIABLE', label: 'Variables' },
                  ]}
                />
              </div>
              <div className={s.filterGroup}>
                <span className={s.filterLabel}>Periodicidad</span>
                <Tabs
                  value={filtroFrec}
                  onChange={setFiltroFrec}
                  options={[
                    { value: 'TODAS', label: 'Todas' },
                    { value: 'MENSUAL', label: 'Mensuales' },
                    { value: 'ANUAL', label: 'Anuales' },
                  ]}
                />
              </div>
            </div>
            {verFijos && (
              <>
                <div className={s.groupHead}>
                  <span className={s.groupTitle}>Fijos</span>
                  <span className={s.groupSub}>Siempre el mismo importe · {fijos.length}</span>
                </div>
                {fijos.length === 0 ? (
                  <p className={s.groupEmpty}>No tienes recurrentes fijos{sufijoFrec}.</p>
                ) : (
                  <div className={s.recGrid}>{fijos.map(renderCard)}</div>
                )}
              </>
            )}
            {verVariables && (
              <>
                <div className={s.groupHead}>
                  <span className={s.groupTitle}>Variables</span>
                  <span className={s.groupSub}>El importe cambia en cada cobro · {variables.length}</span>
                </div>
                {variables.length === 0 ? (
                  <p className={s.groupEmpty}>
                    {filtroFrec === 'TODAS'
                      ? 'No tienes recurrentes variables. Marca como «Variable» los que cambian de un cobro a otro (luz, agua…).'
                      : `No tienes recurrentes variables${sufijoFrec}.`}
                  </p>
                ) : (
                  <div className={s.recGrid}>{variables.map(renderCard)}</div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        onClose={cerrarForm}
        maxWidth={560}
        title={editId === null ? 'Nuevo gasto recurrente' : 'Editar gasto recurrente'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarForm} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_ID} disabled={saving}>
              {saving ? 'Guardando…' : editId === null ? 'Añadir recurrente' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} noValidate>
          <div className={s.row}>
            <div className={s.field}>
              <label>Nombre</label>
              <input
                type="text"
                placeholder="Ej: Alquiler"
                value={form.nombre}
                aria-invalid={err?.field === 'nombre'}
                onChange={(e) => set('nombre', e.target.value)}
              />
              {fieldErr('nombre')}
            </div>
            <div className={s.field}>
              <label>Categoría</label>
              <CategoriaSelect
                value={form.catName}
                categorias={gastoCats}
                invalid={err?.field === 'catName'}
                onChange={(v) => set('catName', v)}
              />
              {fieldErr('catName')}
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label>Frecuencia</label>
              <Select
                value={form.frecuencia}
                options={[
                  { value: 'MENSUAL', label: 'Mensual' },
                  { value: 'ANUAL', label: 'Anual' },
                ]}
                onChange={(v) => set('frecuencia', v as Frecuencia)}
                ariaLabel="Frecuencia"
              />
            </div>
            <div className={s.field}>
              <label>{editId !== null ? 'Precio inicial' : 'Importe'}</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.importe}
                aria-invalid={err?.field === 'importe'}
                onChange={(e) => set('importe', e.target.value)}
              />
              {fieldErr('importe')}
              {editId !== null && (
                <div className={s.fieldNote}>
                  Solo para corregir el precio del alta. Para un cambio de precio usa «
                  {form.tipoImporte === 'VARIABLE' ? 'Importe del mes' : 'Nuevo precio'}».
                </div>
              )}
            </div>
          </div>
          <div className={s.row}>
            <div className={s.field}>
              <label>Fecha primer pago</label>
              <input
                type="date"
                value={form.fechaPrimerPago}
                aria-invalid={err?.field === 'fechaPrimerPago'}
                onChange={(e) => set('fechaPrimerPago', e.target.value)}
              />
              {fieldErr('fechaPrimerPago')}
            </div>
            <div className={s.field}>
              <label>Tipo de importe</label>
              <Select
                value={form.tipoImporte}
                options={[
                  { value: 'FIJO', label: 'Fijo' },
                  { value: 'VARIABLE', label: 'Variable' },
                ]}
                onChange={(v) => set('tipoImporte', v as TipoImporte)}
                ariaLabel="Tipo de importe"
              />
            </div>
          </div>
          <p className={s.hint}>
            Si la categoría no existe, se crea automáticamente (tipo Gasto). Al
            actualizar, si cambias el importe se registra como nueva variación de precio.
            El alta y la baja se gestionan con el interruptor de cada tarjeta. Los cambios
            de importe se hacen desde la tarjeta: «Nuevo precio» en los fijos e «Importe del
            mes» en los variables.
          </p>
        </form>
      </Modal>

      <Modal
        open={mesRec !== null}
        onClose={cerrarImporteMes}
        maxWidth={520}
        title={mesRec ? `Importe del mes · ${mesRec.nombre}` : ''}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarImporteMes} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_MES_ID} disabled={saving}>
              {nuevoPrecio.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        {mesRec && (() => {
          const porMes = importesPorMes(mesRec)
          const existente = porMes.get(claveMes(mesSel.anio, mesSel.mes))
          const prev = mesSel.mes === 0
            ? { anio: mesSel.anio - 1, mes: 11 }
            : { anio: mesSel.anio, mes: mesSel.mes - 1 }
          const importePrev = porMes.get(claveMes(prev.anio, prev.mes))
          const valor = num(mesImporte)
          const diff = importePrev != null && !Number.isNaN(valor) ? valor - importePrev : null
          const anioActual = hoy.getFullYear()
          const mesActual = hoy.getMonth()
          return (
            <form id={FORM_MES_ID} onSubmit={guardarImporteMes} noValidate>
              <div className={s.field}>
                <label>Mes</label>
                <div className={s.yearNav}>
                  <button type="button" onClick={() => setMesAnio((a) => a - 1)} aria-label="Año anterior">‹</button>
                  <strong>{mesAnio}</strong>
                  <button
                    type="button"
                    onClick={() => setMesAnio((a) => Math.min(anioActual + 1, a + 1))}
                    disabled={mesAnio >= anioActual + 1}
                    aria-label="Año siguiente"
                  >
                    ›
                  </button>
                </div>
                <div className={s.monthGrid}>
                  {MESES_CORTOS.map((nombre, m) => {
                    // Se pueden apuntar meses futuros: el importe entra en vigor al llegar ese mes.
                    const futuro = mesAnio > anioActual || (mesAnio === anioActual && m > mesActual)
                    const v = porMes.get(claveMes(mesAnio, m))
                    const sel = mesSel.anio === mesAnio && mesSel.mes === m
                    return (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={sel}
                        className={`${s.monthBtn} ${v != null ? s.monthHas : ''} ${sel ? s.monthSel : ''} ${futuro ? s.monthFut : ''}`}
                        onClick={() => elegirMes(mesRec, mesAnio, m)}
                      >
                        {nombre}
                        <span>{v != null ? `${Math.round(v)} ${currencySymbol()}` : ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={s.row} style={{ marginTop: 16 }}>
                <div className={s.field}>
                  <label>
                    Importe de {MESES_LARGOS[mesSel.mes]} {mesSel.anio}
                  </label>
                  <MoneyInput
                    key={claveMes(mesSel.anio, mesSel.mes)}
                    autoFocus
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={mesImporte}
                    aria-invalid={mesErr !== null}
                    onChange={(e) => {
                      setMesImporte(e.target.value)
                      setMesErr(null)
                    }}
                  />
                  {mesErr && <div className={s.fieldError}>{mesErr}</div>}
                </div>
                <div className={s.field}>
                  <label>Mes anterior</label>
                  <div className={s.prevRef}>
                    {importePrev == null ? (
                      `Sin importe en ${MESES_CORTOS[prev.mes]}`
                    ) : (
                      <>
                        {MESES_CORTOS[prev.mes]}: {formatEur(importePrev, true)}
                        {diff !== null && (
                          <strong style={{ color: diff > 0 ? 'var(--down)' : 'var(--up)' }}>
                            {' · '}
                            {diff >= 0 ? '+' : '−'}
                            {formatEur(Math.abs(diff), true)}
                            {importePrev > 0 && ` (${diff >= 0 ? '+' : '−'}${Math.abs((diff / importePrev) * 100).toFixed(0)}%)`}
                          </strong>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              {existente != null && (
                <p className={s.overwriteNote}>
                  {MESES_LARGOS[mesSel.mes][0].toUpperCase() + MESES_LARGOS[mesSel.mes].slice(1)} ya tiene{' '}
                  {formatEur(existente, true)}: al guardar se sustituye.
                </p>
              )}
              <p className={s.hint}>
                Se guarda como el cobro del {fechaCobro(mesRec, mesSel.anio, mesSel.mes)}.
                {(mesSel.anio > anioActual || (mesSel.anio === anioActual && mesSel.mes > mesActual)) &&
                  ` Es un mes futuro: este importe pasará a ser el vigente el 1 de ${MESES_LARGOS[mesSel.mes]}.`}
              </p>
            </form>
          )
        })()}
      </Modal>

      <Modal
        open={precioRec !== null}
        onClose={cerrarNuevoPrecio}
        maxWidth={480}
        title={precioRec ? `Nuevo precio · ${precioRec.nombre}` : ''}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarNuevoPrecio} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_PRECIO_ID} disabled={saving}>
              {nuevoPrecio.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        {precioRec && (() => {
          const actual = Number(precioRec.importeActual ?? 0)
          const valor = num(precioImporte)
          const diff = !Number.isNaN(valor) && actual > 0 ? valor - actual : null
          // A qué cobro afecta: el del mes de la fecha si el cambio llega antes
          // (o el mismo día) que el cobro; si no, el del mes siguiente.
          let aviso = ''
          if (precioFecha && precioRec.frecuencia === 'MENSUAL') {
            const anio = Number(precioFecha.slice(0, 4))
            const mes = Number(precioFecha.slice(5, 7)) - 1
            const cobro = fechaCobro(precioRec, anio, mes)
            if (precioFecha <= cobro) {
              aviso = `Se aplica ya al cobro del ${cobro}.`
            } else {
              const sig = mes === 11 ? { anio: anio + 1, mes: 0 } : { anio, mes: mes + 1 }
              aviso = `El cobro del ${cobro} va con el precio anterior; el nuevo empieza en el del ${fechaCobro(precioRec, sig.anio, sig.mes)}.`
            }
          } else if (precioFecha) {
            aviso = 'Se aplicará al primer cobro anual a partir de esa fecha.'
          }
          if (precioFecha > today()) {
            aviso += ` La tarjeta seguirá mostrando ${formatEur(actual, true)} hasta el ${precioFecha}.`
          }
          return (
            <form id={FORM_PRECIO_ID} onSubmit={guardarNuevoPrecio} noValidate>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Nuevo importe</label>
                  <MoneyInput
                    autoFocus
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={precioImporte}
                    aria-invalid={precioErr?.field === 'importe'}
                    onChange={(e) => {
                      setPrecioImporte(e.target.value)
                      setPrecioErr(null)
                    }}
                  />
                  {precioErr?.field === 'importe' && <div className={s.fieldError}>{precioErr.msg}</div>}
                </div>
                <div className={s.field}>
                  <label>Precio actual</label>
                  <div className={s.prevRef}>
                    {formatEur(actual, true)}
                    {diff !== null && (
                      <strong style={{ color: diff > 0 ? 'var(--down)' : 'var(--up)' }}>
                        {' · '}
                        {diff >= 0 ? '+' : '−'}
                        {formatEur(Math.abs(diff), true)}
                      </strong>
                    )}
                  </div>
                </div>
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label>Fecha del cambio</label>
                  <input
                    type="date"
                    value={precioFecha}
                    aria-invalid={precioErr?.field === 'fecha'}
                    onChange={(e) => {
                      setPrecioFecha(e.target.value)
                      setPrecioErr(null)
                    }}
                  />
                  {precioErr?.field === 'fecha' && <div className={s.fieldError}>{precioErr.msg}</div>}
                </div>
              </div>
              {aviso && <p className={s.hint}>{aviso}</p>}
            </form>
          )
        })()}
      </Modal>

      <Modal open={detail !== null} onClose={() => setDetail(null)} maxWidth={560}>
        {detail && (
          <>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>{detail.nombre}</div>
              </div>
              <button className={s.closeBtn} onClick={() => setDetail(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <div className={s.modalSub}>{detail.categoriaNombre ?? 'Sin categoría'}</div>

            {hist.length > 0 && (
              <div className={s.histChart}>
                <Line
                  key={`line-${theme}-${detail.id}`}
                  data={lineData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (c) => ` ${formatEur(Number(c.parsed.y), true)}`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                      y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                    },
                  }}
                />
              </div>
            )}

            <Tabs
              className={s.detailTabs}
              value={detailTab}
              onChange={setDetailTab}
              options={[
                { value: 'precio', label: 'Variación de precio' },
                { value: 'periodos', label: 'Altas y bajas' },
              ]}
            />

            {detailTab === 'periodos' ? (
              periodos.length === 0 ? (
                <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
                  No hay altas ni bajas registradas para este gasto todavía.
                </p>
              ) : (
                <table className={s.histTable}>
                  <thead>
                    <tr>
                      <th>Alta</th>
                      <th>Baja</th>
                      <th>Último pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodos.map((p) => (
                      <tr key={`${p.id}-${p.fechaInicio}`}>
                        <td>{p.fechaInicio}</td>
                        <td>{p.fechaFin ?? 'En curso'}</td>
                        <td>{p.fechaUltimoPago ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : hist.length === 0 ? (
              <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
                No hay historial de precios para este gasto todavía.
              </p>
            ) : changes.length === 0 ? (
              <p className={s.hint}>
                Precio inicial {formatEur(hist[0].importe, true)} · sin cambios registrados.
              </p>
            ) : (
              <table className={s.histTable}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Valor anterior</th>
                    <th>Valor nuevo</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c, i) => (
                    <tr key={i}>
                      <td>{c.fecha}</td>
                      <td>{formatEur(c.antes, true)}</td>
                      <td>{formatEur(c.despues, true)}</td>
                      <td style={{ color: c.diff >= 0 ? 'var(--down)' : 'var(--up)' }}>
                        {c.diff >= 0 ? '+' : '−'}
                        {formatEur(Math.abs(c.diff), true)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
