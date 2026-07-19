import { useMemo, useRef, useState, type FormEvent } from 'react'
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
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import type { Frecuencia, GastoRecurrenteResponse } from '@/types/api'
import s from './Suscripciones.module.css'

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

export default function Suscripciones() {
  const { theme } = useTheme()
  const confirm = useConfirm()
  const { data: recurrentes, isLoading, isError, error } = useRecurrentes()
  const { data: resumen } = useResumenRecurrente('SUSCRIPCION')
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
  const [detailSub, setDetailSub] = useState<GastoRecurrenteResponse | null>(null)

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

  function switchMode(m: Mode) {
    setMode(m)
    setErr(null)
    setSelId('')
    setForm({ ...EMPTY })
  }

  function loadSub(id: string) {
    setSelId(id)
    const sub = subs.find((x) => x.id === Number(id))
    if (sub) {
      setForm({
        nombre: sub.nombre,
        catName: sub.categoriaNombre ?? '',
        frecuencia: sub.frecuencia,
        importe: sub.importeActual != null ? String(sub.importeActual) : '',
        fechaPrimerPago: sub.fechaPrimerPago ?? today(),
        active: sub.active,
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
      return setErr({ field: 'selId', msg: 'Selecciona una suscripción.' })
    if (!nombre) return setErr({ field: 'nombre', msg: 'Indica el nombre de la suscripción.' })
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
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: form.fechaPrimerPago,
          active: form.active,
          importeInicial: importe,
        })
      } else {
        const sub = subs.find((x) => x.id === Number(selId))
        await actualizarRecurrente.mutateAsync({
          id: Number(selId),
          nombre,
          categoriaId,
          tipoPago: 'SUSCRIPCION',
          frecuencia: form.frecuencia,
          fechaPrimerPago: form.fechaPrimerPago,
          fechaUltimoPago: sub?.fechaUltimoPago ?? form.fechaPrimerPago,
          active: form.active,
        })
        if (sub && Number(sub.importeActual || 0) !== importe) {
          await nuevoPrecio.mutateAsync({
            id: Number(selId),
            importe,
            fechaVariacionImporte: today(),
          })
        }
      }
      notifyOk(mode === 'nueva' ? 'Suscripción creada' : 'Suscripción actualizada')
      switchMode(mode)
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
      if (Number(selId) === sub.id) switchMode('actualizar')
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

  return (
    <div>
      <div className={s.header}>
        <h1>Suscripciones</h1>
        <p>Controla tus suscripciones activas y cuánto te cuestan al mes</p>
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
          <div className={s.kpiLabel}>Activas</div>
          <div className={s.kpiValue}>{numActivas}</div>
        </div>
        <div className={s.kpi}>
          <div className={s.kpiLabel}>Total</div>
          <div className={s.kpiValue}>{numTotal}</div>
        </div>
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis suscripciones</div>
        {subs.length === 0 ? (
          <EmptyState
            message="No tienes suscripciones registradas. Añade la primera para controlar tu gasto mensual."
            actionLabel="Añadir tu primera suscripción"
            onAction={irAlFormulario}
          />
        ) : (
          <div className={s.subGrid}>
            {subs.map((r) => (
              <div
                key={r.id}
                className={`${s.subCard} ${r.active ? '' : s.inactive}`}
                onClick={() => setDetailSub(r)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setDetailSub(r)}
              >
                <div className={s.subTop}>
                  <div>
                    <div className={s.subName}>{r.nombre}</div>
                    <div className={s.subCat}>{r.categoriaNombre ?? '—'}</div>
                  </div>
                  <span className={r.active ? s.badgeOn : s.badgeOff}>
                    {r.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <div className={s.subPrice}>
                  {formatEur(r.importeActual, true)}{' '}
                  <span>/{r.frecuencia === 'ANUAL' ? 'año' : 'mes'}</span>
                </div>
                <div className={s.subMeta}>Próximo pago: {r.fechaProximoPago ?? '—'}</div>
                <div className={s.clickHint}>Clic para ver el historial de precios →</div>
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
            Nueva suscripción
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
                <label>Suscripción a actualizar</label>
                <Select
                  value={selId}
                  options={subs.map((r) => ({ value: String(r.id), label: r.nombre }))}
                  placeholder="Selecciona"
                  invalid={err?.field === 'selId'}
                  onChange={(v) => {
                    loadSub(v)
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
                  Activa
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
                    ? 'Añadir suscripción'
                    : 'Actualizar suscripción'}
              </button>
            </>
          )}
        </form>
      </div>

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
            <div className={s.modalSub}>
              Historial de precios · {detailSub.categoriaNombre ?? 'Sin categoría'}
            </div>

            {hist.length === 0 ? (
              <p style={{ color: 'var(--tx3)', fontSize: 13 }}>
                No hay historial de precios para esta suscripción todavía.
              </p>
            ) : (
              <>
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
                {changes.length === 0 ? (
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
          </>
        )}
      </Modal>
    </div>
  )
}
