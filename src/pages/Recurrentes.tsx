import { useMemo, useRef, useState, type FormEvent } from 'react'
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
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import type { Frecuencia, GastoRecurrenteResponse } from '@/types/api'
import s from './Recurrentes.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const today = () => new Date().toISOString().slice(0, 10)

type Mode = 'nueva' | 'actualizar'

const EMPTY = {
  nombre: '',
  catName: '',
  frecuencia: 'MENSUAL' as Frecuencia,
  importe: '',
  fechaPrimerPago: today(),
  active: true,
}

export default function Recurrentes() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: recurrentesData, isLoading, isError, error } = useRecurrentes()
  const { data: resumen } = useResumenRecurrente('RECURRENTE')
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

  const [mode, setMode] = useState<Mode>('nueva')
  const [selId, setSelId] = useState('')
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null
  const [detail, setDetail] = useState<GastoRecurrenteResponse | null>(null)

  const formRef = useRef<HTMLDivElement>(null)
  function irAlFormulario() {
    switchMode('nueva')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
      350,
    )
  }

  if (isLoading) {
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
  const gastoMensual = resumen?.gastoMensual ?? 0
  const gastoAnual = resumen?.gastoAnual ?? 0
  const numActivos = resumen?.activos ?? activos.length
  const numTotal = resumen?.total ?? recs.length

  // Gasto real por mes: los mensuales cuentan cada mes; cada anual cae en el mes de su pago.
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const porMesMensual: number[] = new Array(12).fill(0)
  const porMesAnual: number[] = new Array(12).fill(0)
  const anualesPorMes: string[][] = Array.from({ length: 12 }, () => [])
  activos.forEach((r) => {
    const imp = Number(r.importeActual || 0)
    if (r.frecuencia === 'MENSUAL') {
      for (let m = 0; m < 12; m++) porMesMensual[m] += imp
    } else {
      const fecha = r.fechaProximoPago ?? r.fechaPrimerPago
      if (fecha) {
        const m = Number(fecha.slice(5, 7)) - 1
        if (m >= 0 && m < 12) {
          porMesAnual[m] += imp
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
  const changes = hist.slice(1).map((h, i) => {
    const antes = Number(hist[i].importe || 0)
    const despues = Number(h.importe || 0)
    return { fecha: h.fechaVariacionImporte, antes, despues, diff: despues - antes }
  })
  const lineData = {
    labels: hist.map((h) => h.fechaVariacionImporte),
    datasets: [
      {
        label: 'Precio (€)',
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

  function switchMode(m: Mode) {
    setMode(m)
    setErr(null)
    setSelId('')
    setForm({ ...EMPTY })
  }

  function loadRec(id: string) {
    setSelId(id)
    const rec = recs.find((x) => x.id === Number(id))
    if (rec) {
      setForm({
        nombre: rec.nombre,
        catName: rec.categoriaNombre ?? '',
        frecuencia: rec.frecuencia,
        importe: rec.importeActual != null ? String(rec.importeActual) : '',
        fechaPrimerPago: rec.fechaPrimerPago ?? today(),
        active: rec.active,
      })
    }
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
    if (mode === 'actualizar' && !selId)
      return setErr({ field: 'selId', msg: 'Selecciona un gasto recurrente.' })
    if (!nombre) return setErr({ field: 'nombre', msg: 'Indica el nombre del gasto recurrente.' })
    if (!catName) return setErr({ field: 'catName', msg: 'Indica una categoría.' })
    if (Number.isNaN(importe) || importe <= 0)
      return setErr({ field: 'importe', msg: 'El importe debe ser mayor que 0.' })
    if (!form.fechaPrimerPago)
      return setErr({ field: 'fechaPrimerPago', msg: 'Indica la fecha del primer pago.' })

    try {
      const categoriaId = await resolverCategoriaId(catName)
      if (mode === 'nueva') {
        await crearRecurrente.mutateAsync({
          nombre,
          categoriaId,
          tipoPago: 'RECURRENTE',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: form.fechaPrimerPago,
          active: form.active,
          importeInicial: importe,
        })
      } else {
        const rec = recs.find((x) => x.id === Number(selId))
        await actualizarRecurrente.mutateAsync({
          id: Number(selId),
          nombre,
          categoriaId,
          tipoPago: 'RECURRENTE',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: rec?.fechaUltimoPago ?? form.fechaPrimerPago,
          active: form.active,
        })
        if (rec && Number(rec.importeActual || 0) !== importe) {
          await nuevoPrecio.mutateAsync({
            id: Number(selId),
            importe,
            fechaVariacionImporte: today(),
          })
        }
      }
      notifyOk(mode === 'nueva' ? 'Gasto recurrente creado' : 'Gasto recurrente actualizado')
      switchMode(mode)
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
      if (Number(selId) === rec.id) switchMode('actualizar')
    } catch (err) {
      notifyError(err)
    }
  }

  const saving =
    crearRecurrente.isPending ||
    actualizarRecurrente.isPending ||
    nuevoPrecio.isPending ||
    eliminarRecurrente.isPending ||
    crearCategoria.isPending

  return (
    <div>
      <div className={s.header}>
        <h1>Gastos recurrentes</h1>
        <p>Tus gastos fijos mensuales y anuales</p>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gasto mensual</div>
          <div className={s.kpiValue}>{formatEur(gastoMensual, true)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Gasto anual</div>
          <div className={s.kpiValue}>{formatEur(gastoAnual)}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Activos</div>
          <div className={s.kpiValue}>{numActivos}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total</div>
          <div className={s.kpiValue}>{numTotal}</div>
        </div>
      </div>

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
        <div className="sec-title">Mis gastos recurrentes</div>
        {recs.length === 0 ? (
          <EmptyState
            message="No tienes gastos recurrentes registrados. Añade el primero para ver tu gasto fijo mensual."
            actionLabel="Añadir tu primer recurrente"
            onAction={irAlFormulario}
          />
        ) : (
          <div className={s.recGrid}>
            {recs.map((r) => (
              <div
                key={r.id}
                className={`${s.recCard} ${r.active ? '' : s.inactive}`}
                onClick={() => setDetail(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDetail(r)}
              >
                <div className={s.recTop}>
                  <div>
                    <div className={s.recName}>{r.nombre}</div>
                    <div className={s.recCat}>{r.categoriaNombre ?? '—'}</div>
                  </div>
                  <span className={r.active ? s.badgeOn : s.badgeOff}>
                    {r.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className={s.recPrice}>
                  {formatEur(r.importeActual, true)}{' '}
                  <span>/{r.frecuencia === 'ANUAL' ? 'año' : 'mes'}</span>
                </div>
                <div className={s.recMeta}>Próximo pago: {r.fechaProximoPago ?? '—'}</div>
                <div className={s.clickHint}>Clic para ver el historial de precios →</div>
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
            ))}
          </div>
        )}
      </div>

      <div ref={formRef} className={`card ${s.cardBlock}`}>
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${mode === 'nueva' ? s.tabActive : ''}`}
            onClick={() => switchMode('nueva')}
          >
            Nuevo recurrente
          </button>
          <button
            type="button"
            className={`${s.tab} ${mode === 'actualizar' ? s.tabActive : ''}`}
            onClick={() => switchMode('actualizar')}
          >
            Actualizar
          </button>
        </div>

        <form onSubmit={submit} noValidate>
          {mode === 'actualizar' && (
            <div className={s.row}>
              <div className={s.field}>
                <label>Gasto a actualizar</label>
                <Select
                  value={selId}
                  options={recs.map((r) => ({ value: String(r.id), label: r.nombre }))}
                  placeholder="Selecciona"
                  invalid={err?.field === 'selId'}
                  onChange={(v) => {
                    loadRec(v)
                    setErr(null)
                  }}
                />
                {fieldErr('selId')}
              </div>
            </div>
          )}

          {(mode === 'nueva' || selId) && (
            <>
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
                  <label>Importe (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={form.importe}
                    aria-invalid={err?.field === 'importe'}
                    onChange={(e) => set('importe', e.target.value)}
                  />
                  {fieldErr('importe')}
                </div>
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
                <label className={s.check}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                  />
                  Activo
                </label>
              </div>
              <p className={s.hint}>
                Si la categoría no existe, se crea automáticamente (tipo Gasto). Al
                actualizar, si cambias el importe se registra como nueva variación de precio.
              </p>
              <button className={s.btn} type="submit" disabled={saving} style={{ marginTop: 4 }}>
                {saving
                  ? 'Guardando…'
                  : mode === 'nueva'
                    ? 'Añadir recurrente'
                    : 'Actualizar recurrente'}
              </button>
            </>
          )}
        </form>
      </div>

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
            <div className={s.modalSub}>
              Historial de precios · {detail.categoriaNombre ?? 'Sin categoría'}
            </div>

            {hist.length === 0 ? (
              <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
                No hay historial de precios para este gasto todavía.
              </p>
            ) : (
              <>
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
                {changes.length === 0 ? (
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
          </>
        )}
      </Modal>
    </div>
  )
}
