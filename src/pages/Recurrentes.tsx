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
import type { Frecuencia, GastoRecurrenteResponse } from '@/types/api'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import s from './Recurrentes.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const today = () => new Date().toISOString().slice(0, 10)

/** Id del formulario del modal: permite que el botón de guardar viva en el footer. */
const FORM_ID = 'form-recurrente'

const EMPTY = {
  nombre: '',
  catName: '',
  frecuencia: 'MENSUAL' as Frecuencia,
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
      importe: rec.importeActual != null ? String(rec.importeActual) : '',
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
        })
        if (rec && Number(rec.importeActual || 0) !== importe) {
          await nuevoPrecio.mutateAsync({
            id: editId,
            importe,
            fechaVariacionImporte: today(),
          })
        }
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
        <StatCard label="Gasto anual" value={formatEur(gastoAnual)} />
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
          <div className={s.recGrid}>
            {recs.map((r) => (
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
            ))}
          </div>
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
              <label>Importe</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={form.importe}
                aria-invalid={err?.field === 'importe'}
                onChange={(e) => set('importe', e.target.value)}
              />
              {fieldErr('importe')}
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
          </div>
          <p className={s.hint}>
            Si la categoría no existe, se crea automáticamente (tipo Gasto). Al
            actualizar, si cambias el importe se registra como nueva variación de precio.
            El alta y la baja se gestionan con el interruptor de cada tarjeta.
          </p>
        </form>
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
