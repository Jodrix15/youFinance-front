import { useMemo, useState, type FormEvent } from 'react'
import { Line } from 'react-chartjs-2'
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
import s from './Suscripciones.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const today = () => new Date().toISOString().slice(0, 10)

/** Id del formulario del modal: permite que el botón de guardar viva en el footer. */
const FORM_ID = 'form-suscripcion'

const EMPTY = {
  nombre: '',
  catName: '',
  frecuencia: 'MENSUAL' as Frecuencia,
  importe: '',
  fechaPrimerPago: today(),
}

export default function Suscripciones() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: recurrentes, isLoading, isError, error } = useRecurrentes()
  const { data: resumen, isLoading: resumenLoading } = useResumenRecurrente('SUSCRIPCION')
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

  // Formulario en modal: editId null = alta, número = edición de esa suscripción.
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null
  const [detailSub, setDetailSub] = useState<GastoRecurrenteResponse | null>(null)
  const [detailTab, setDetailTab] = useState<'precio' | 'periodos'>('precio')

  if (isLoading || resumenLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={180} height={26} />
          <Skeleton width={340} height={14} style={{ marginTop: 8 }} />
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
          <Skeleton width={160} height={13} style={{ marginBottom: 16 }} />
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

  const subs = (recurrentes ?? []).filter((r) => r.tipoPago === 'SUSCRIPCION')
  const gastoMensual = resumen?.gastoMensual ?? 0
  const gastoAnual = resumen?.gastoAnual ?? 0
  const numActivas = resumen?.activos ?? subs.filter((r) => r.active).length
  const numTotal = resumen?.total ?? subs.length

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
  function abrirDetalle(sub: GastoRecurrenteResponse) {
    setDetailTab('precio')
    setDetailSub(sub)
  }

  function abrirEditar(sub: GastoRecurrenteResponse) {
    setEditId(sub.id)
    setForm({
      nombre: sub.nombre,
      catName: sub.categoriaNombre ?? '',
      frecuencia: sub.frecuencia,
      importe: sub.importeActual != null ? String(sub.importeActual) : '',
      fechaPrimerPago: sub.fechaPrimerPago ?? today(),
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
    if (!nombre) return setErr({ field: 'nombre', msg: 'Indica el nombre de la suscripción.' })
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
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          importeInicial: importe,
        })
      } else {
        const sub = subs.find((x) => x.id === editId)
        await actualizarRecurrente.mutateAsync({
          id: editId,
          nombre,
          categoriaId,
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          // El alta/baja se maneja con el interruptor de la tarjeta, no aquí.
          active: sub?.active ?? true,
        })
        if (sub && Number(sub.importeActual || 0) !== importe) {
          await nuevoPrecio.mutateAsync({
            id: editId,
            importe,
            fechaVariacionImporte: today(),
          })
        }
      }
      notifyOk(editId === null ? 'Suscripción creada' : 'Suscripción actualizada')
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
  async function toggleActiva(sub: GastoRecurrenteResponse, active: boolean) {
    try {
      await actualizarRecurrente.mutateAsync({
        id: sub.id,
        nombre: sub.nombre,
        categoriaId: sub.categoriaId!,
        tipoPago: 'SUSCRIPCION',
        frecuencia: sub.frecuencia,
        fechaPrimerPago: sub.fechaPrimerPago ?? today(),
        active,
      })
      notifyOk(active ? 'Suscripción activada' : 'Suscripción dada de baja')
    } catch (error) {
      notifyError(error)
    }
  }

  async function deleteSub(sub: GastoRecurrenteResponse) {
    const ok = await confirm({
      title: 'Eliminar suscripción',
      message: (
        <>
          ¿Seguro que quieres eliminar <strong>{sub.nombre}</strong>? Esta acción
          no se puede deshacer.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarRecurrente.mutateAsync(sub.id)
      notifyOk('Suscripción eliminada')
      if (editId === sub.id) cerrarForm()
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

  // ── Modal de historial ──
  const t = chartTheme()
  const hist = detailSub?.historial ?? []
  // Del más reciente al más antiguo: la última alta es la que suele interesar.
  const periodos = [...(detailSub?.periodos ?? [])].reverse()
  // Cada cambio de precio: valor anterior, valor nuevo y diferencia.
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

  return (
    <div>

      <StatGrid>
        <StatCard label="Gasto mensual" value={formatEur(gastoMensual, true)} />
        <StatCard label="Gasto anual" value={formatEur(gastoAnual)} />
        <StatCard label="Activas" value={numActivas} />
        <StatCard label="Total" value={numTotal} />
      </StatGrid>

      <div className={`card ${s.cardBlock}`}>
        <div className="block-head">
          <div className="sec-title">Mis suscripciones</div>
          <button type="button" className={s.btn} onClick={abrirNueva} disabled={saving}>
            + Añadir suscripción
          </button>
        </div>
        {subs.length === 0 ? (
          <EmptyState
            message="No tienes suscripciones registradas. Añade la primera para controlar tu gasto mensual."
            actionLabel="Añadir tu primera suscripción"
            onAction={abrirNueva}
          />
        ) : (
          <div className={s.subGrid}>
            {subs.map((r) => (
              <div
                key={r.id}
                className={`${s.subCard} ${r.active ? '' : s.inactive}`}
                onClick={() => abrirDetalle(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && abrirDetalle(r)}
              >
                <div className={s.subTop}>
                  <div>
                    <div className={s.subName}>{r.nombre}</div>
                    <div className={s.subCat}>{r.categoriaNombre ?? '—'}</div>
                  </div>
                  <Toggle
                    checked={r.active}
                    label={r.active ? 'Activa' : 'Inactiva'}
                    ariaLabel={`Suscripción ${r.nombre}: activa o inactiva`}
                    disabled={saving}
                    onChange={(v) => toggleActiva(r, v)}
                  />
                </div>
                <div className={s.subPrice}>
                  {formatEur(r.importeActual, true)}{' '}
                  <span>/{r.frecuencia === 'ANUAL' ? 'año' : 'mes'}</span>
                </div>
                <div className={s.subMeta}>
                  {r.active
                    ? `Próximo pago: ${r.fechaProximoPago ?? '—'}`
                    : r.fechaFin
                      ? `Baja: ${r.fechaFin}`
                      : 'Sin fecha de baja registrada'}
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
                      deleteSub(r)
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
        title={editId === null ? 'Nueva suscripción' : 'Editar suscripción'}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={cerrarForm} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_ID} disabled={saving}>
              {saving ? 'Guardando…' : editId === null ? 'Añadir suscripción' : 'Guardar cambios'}
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
                placeholder="Ej: Netflix"
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

      <Modal open={detailSub !== null} onClose={() => setDetailSub(null)} maxWidth={560}>
        {detailSub && (
          <>
            <div className={s.modalHead}>
              <div>
                <div className={s.modalTitle}>{detailSub.nombre}</div>
              </div>
              <button
                className={s.closeBtn}
                onClick={() => setDetailSub(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className={s.modalSub}>{detailSub.categoriaNombre ?? 'Sin categoría'}</div>

            {hist.length > 0 && (
              <div className={s.histChart}>
                <Line
                  key={`line-${theme}-${detailSub.id}`}
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
                  No hay altas ni bajas registradas para esta suscripción todavía.
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
                No hay historial de precios para esta suscripción todavía.
              </p>
            ) : changes.length === 0 ? (
              <p className={s.hint}>
                Precio inicial {formatEur(hist[0].importe, true)} · sin subidas registradas.
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
