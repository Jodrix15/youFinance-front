import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  useActualizarPresupuesto,
  useCategorias,
  useCrearPresupuesto,
  useDeudas,
  useEliminarPresupuesto,
  useMovimientos,
  usePresupuestos,
  useRecurrentes,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { calcularGastosFijos } from '@/lib/gastosFijos'
import { apiErrorMessage } from '@/lib/api'
import type {
  Movimiento,
  PartidaDTO,
  PeriodoPresupuesto,
  PresupuestoResponse,
} from '@/types/api'
import s from './Presupuestos.module.css'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const NOW = new Date()
const ANIOS = Array.from({ length: 5 }, (_, i) => String(NOW.getFullYear() + 1 - i))
const PERIODOS: { value: PeriodoPresupuesto; label: string }[] = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'SEMANAL', label: 'Semanal' },
]
const PLANTILLAS: { value: string; label: string }[] = [
  { value: 'personalizado', label: 'Personalizado (en blanco)' },
  { value: 'regla', label: 'Regla 50 / 30 / 20' },
  { value: 'basico', label: 'Básico (categorías comunes)' },
]

const pad = (n: number) => String(n).padStart(2, '0')
const num = (v: string) => (v.trim() === '' ? 0 : Number(v.replace(',', '.')))
const round2 = (n: number) => Math.round(n * 100) / 100

const diasEnMes = (anio: number, mes: number) => new Date(anio, mes, 0).getDate()

// Día de la semana (lunes = 0 … domingo = 6) en que cae el día 1 del mes.
function primerDiaSemana(anio: number, mes: number): number {
  const dow = new Date(anio, mes - 1, 1).getDay() // 0=domingo … 6=sábado
  return (dow + 6) % 7
}

// Semanas naturales (lunes-domingo): la primera y la última pueden ser parciales.
function semanasEnMes(anio: number, mes: number): number {
  const off = primerDiaSemana(anio, mes)
  return Math.floor((diasEnMes(anio, mes) - 1 + off) / 7) + 1
}

function semanaDeDia(dia: number, anio: number, mes: number): number {
  const off = primerDiaSemana(anio, mes)
  return Math.floor((dia - 1 + off) / 7) + 1
}

/** Tramo de una semana dentro del mes: día inicial, final y nº de días reales. */
function tramoSemana(semana: number, anio: number, mes: number) {
  const off = primerDiaSemana(anio, mes)
  const dias = diasEnMes(anio, mes)
  const startDom = (semana - 1) * 7 - off + 1
  const inicio = Math.max(1, startDom)
  const fin = Math.min(dias, startDom + 6)
  return { inicio, fin, dias: Math.max(0, fin - inicio + 1) }
}

/** Fracción del mes que representa una semana (según sus días reales). */
function fraccionSemana(semana: number, anio: number, mes: number): number {
  return tramoSemana(semana, anio, mes).dias / diasEnMes(anio, mes)
}

function rangoSemana(semana: number, anio: number, mes: number): string {
  const { inicio, fin } = tramoSemana(semana, anio, mes)
  return `${inicio}–${fin}`
}

function enSemana(fecha: string, semana: number, anio: number, mes: number): boolean {
  return semanaDeDia(Number(fecha.slice(8, 10)), anio, mes) === semana
}

/** Gasto real de una categoría en el periodo (mes, o semana si se indica). */
function gastoReal(
  movs: Movimiento[],
  categoriaId: number,
  anio: number,
  mes: number,
  semana: number | null,
): number {
  const prefijo = `${anio}-${pad(mes)}`
  return movs
    .filter(
      (m) =>
        m.tipoMovimiento === 'GASTO' &&
        m.categoriaId === categoriaId &&
        m.fechaTransaccion.startsWith(prefijo) &&
        (semana == null || enSemana(m.fechaTransaccion, semana, anio, mes)),
    )
    .reduce((a, m) => a + Math.abs(Number(m.importe || 0)), 0)
}

/** Gasto real total de una semana, limitado a un conjunto de categorías (o todas si vacío). */
function gastoSemana(
  movs: Movimiento[],
  categoriaIds: number[],
  anio: number,
  mes: number,
  semana: number,
): number {
  const prefijo = `${anio}-${pad(mes)}`
  return movs
    .filter(
      (m) =>
        m.tipoMovimiento === 'GASTO' &&
        m.fechaTransaccion.startsWith(prefijo) &&
        enSemana(m.fechaTransaccion, semana, anio, mes) &&
        (categoriaIds.length === 0 ||
          (m.categoriaId != null && categoriaIds.includes(m.categoriaId))),
    )
    .reduce((a, m) => a + Math.abs(Number(m.importe || 0)), 0)
}

function disponibleDe(p: PresupuestoResponse, gfTotal: number): number {
  if (!p.descontarGastosFijos) return p.cantidadBase
  // En un presupuesto semanal se descuenta la parte proporcional de gastos fijos
  // según los días reales de esa semana (la 1ª y la última pueden ser parciales).
  const share =
    p.periodo === 'SEMANAL' && p.semana != null
      ? gfTotal * fraccionSemana(p.semana, p.anio, p.mes)
      : gfTotal
  return p.cantidadBase - share
}

function barra(gastado: number, presupuestado: number): { cls: string; width: number } {
  if (presupuestado <= 0) return { cls: s.fillOk, width: 0 }
  const ratio = gastado / presupuestado
  const cls = ratio > 1 ? s.fillOver : ratio > 0.8 ? s.fillWarn : s.fillOk
  return { cls, width: Math.min(ratio, 1) * 100 }
}

interface PartidaForm {
  key: string
  tipo: 'categoria' | 'libre'
  categoriaId: string
  nombre: string
  importe: string
}

let keySeq = 0
const nuevaFila = (tipo: 'categoria' | 'libre', nombre = '', importe = ''): PartidaForm => ({
  key: `p${keySeq++}`,
  tipo,
  categoriaId: '',
  nombre,
  importe,
})

// ── Tarjeta de un presupuesto guardado ──
function BudgetCard({
  p,
  movimientos,
  gfTotal,
  onEdit,
  onDelete,
}: {
  p: PresupuestoResponse
  movimientos: Movimiento[]
  gfTotal: number
  onEdit: (p: PresupuestoResponse) => void
  onDelete: (p: PresupuestoResponse) => void
}) {
  const [vista, setVista] = useState<'partidas' | 'semanas'>('partidas')
  const disponible = disponibleDe(p, gfTotal)
  const sinAsignar = disponible - p.totalPresupuestado
  const semanas = semanasEnMes(p.anio, p.mes)
  const catIds = p.partidas.map((pa) => pa.categoriaId).filter((c): c is number => c != null)

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <div className={s.cardTitle}>{p.nombre}</div>
          <div className={s.cardMeta}>
            <span className={`${s.badge} ${p.periodo === 'SEMANAL' ? s.badgeWeek : ''}`}>
              {p.periodo === 'SEMANAL' ? `Semana ${p.semana}` : 'Mensual'}
            </span>{' '}
            {MESES[p.mes - 1]} {p.anio}
          </div>
        </div>
        <div className={s.headActions}>
          <button
            type="button"
            className={s.iconBtn}
            aria-label={`Editar presupuesto ${p.nombre}`}
            title="Editar"
            onClick={() => onEdit(p)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z" /></svg>
          </button>
          <button
            type="button"
            className={`${s.iconBtn} ${s.iconDanger}`}
            aria-label={`Eliminar presupuesto ${p.nombre}`}
            title="Eliminar"
            onClick={() => onDelete(p)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" /><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" /></svg>
          </button>
        </div>
      </div>

      <div className={s.figures}>
        <div className={s.figure}>
          <div className={s.figureLabel}>Disponible</div>
          <div className={s.figureValue}>{formatEur(disponible, true)}</div>
        </div>
        <div className={s.figure}>
          <div className={s.figureLabel}>Asignado</div>
          <div className={s.figureValue}>{formatEur(p.totalPresupuestado, true)}</div>
        </div>
        <div className={s.figure}>
          <div className={s.figureLabel}>Sin asignar</div>
          <div className={`${s.figureValue} ${sinAsignar < 0 ? s.figureNeg : s.figurePos}`}>
            {formatEur(sinAsignar, true)}
          </div>
        </div>
      </div>

      {p.periodo === 'MENSUAL' && (
        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${vista === 'partidas' ? s.tabActive : ''}`}
            onClick={() => setVista('partidas')}
          >
            Partidas
          </button>
          <button
            type="button"
            className={`${s.tab} ${vista === 'semanas' ? s.tabActive : ''}`}
            onClick={() => setVista('semanas')}
          >
            Por semanas
          </button>
        </div>
      )}

      {vista === 'partidas' || p.periodo === 'SEMANAL' ? (
        <div className={s.partidas}>
          {p.partidas.map((pa) => {
            const gastado =
              pa.categoriaId != null
                ? gastoReal(movimientos, pa.categoriaId, p.anio, p.mes, p.semana)
                : null
            const { cls, width } = barra(gastado ?? 0, pa.importe)
            const nombre = pa.categoriaNombre ?? pa.nombre ?? 'Partida'
            return (
              <div key={pa.id} className={s.partida}>
                <div className={s.partidaTop}>
                  <span className={s.partidaName}>{nombre}</span>
                  <span className={s.partidaVals}>
                    {gastado != null ? (
                      <>
                        <b>{formatEur(gastado, true)}</b> / {formatEur(pa.importe, true)}
                      </>
                    ) : (
                      <>
                        Presupuestado <b>{formatEur(pa.importe, true)}</b>
                      </>
                    )}
                  </span>
                </div>
                {gastado != null && (
                  <div className={s.track}>
                    <div className={`${s.fill} ${cls}`} style={{ width: `${width}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <table className={s.weekTable}>
          <thead>
            <tr>
              <th>Semana</th>
              <th>Objetivo</th>
              <th>Gastado</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: semanas }, (_, i) => i + 1).map((w) => {
              const tramo = tramoSemana(w, p.anio, p.mes)
              // Objetivo proporcional a los días reales de la semana.
              const objetivo = disponible * (tramo.dias / diasEnMes(p.anio, p.mes))
              const gastado = gastoSemana(movimientos, catIds, p.anio, p.mes, w)
              return (
                <tr key={w}>
                  <td>
                    Semana {w}{' '}
                    <span style={{ color: 'var(--tx2)' }}>
                      (días {tramo.inicio}–{tramo.fin})
                    </span>
                  </td>
                  <td>{formatEur(objetivo, true)}</td>
                  <td style={{ color: gastado > objetivo ? 'var(--down)' : 'var(--tx1)' }}>
                    {formatEur(gastado, true)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Presupuestos() {
  const presupuestos = usePresupuestos()
  const categorias = useCategorias()
  const movimientos = useMovimientos()
  const rec = useRecurrentes()
  const deu = useDeudas()
  const crear = useCrearPresupuesto()
  const actualizar = useActualizarPresupuesto()
  const eliminar = useEliminarPresupuesto()
  const confirm = useConfirm()
  const formRef = useRef<HTMLFormElement>(null)

  const gfTotal = useMemo(
    () => calcularGastosFijos(rec.data, deu.data).total,
    [rec.data, deu.data],
  )
  const catOptions = useMemo(
    () =>
      (categorias.data ?? [])
        .filter((c) => c.tipo === 'GASTO')
        .map((c) => ({ value: String(c.id), label: c.nombre })),
    [categorias.data],
  )

  // ── Estado del formulario ──
  const [editId, setEditId] = useState<number | null>(null)
  const [nombre, setNombre] = useState('')
  const [periodo, setPeriodo] = useState<PeriodoPresupuesto>('MENSUAL')
  const [mes, setMes] = useState(pad(NOW.getMonth() + 1))
  const [anio, setAnio] = useState(String(NOW.getFullYear()))
  const [semana, setSemana] = useState('1')
  const [base, setBase] = useState('')
  const [descontar, setDescontar] = useState(true)
  const [plantilla, setPlantilla] = useState('personalizado')
  const [partidas, setPartidas] = useState<PartidaForm[]>([])
  const [err, setErr] = useState<string | null>(null)

  const anioN = Number(anio)
  const mesN = Number(mes)
  const semanas = semanasEnMes(anioN, mesN)
  const share =
    periodo === 'SEMANAL' ? gfTotal * fraccionSemana(Number(semana), anioN, mesN) : gfTotal
  const disponibleForm = num(base) - (descontar ? share : 0)
  const asignado = partidas.reduce((a, p) => a + num(p.importe), 0)
  const sinAsignar = disponibleForm - asignado

  function resetForm() {
    setEditId(null)
    setNombre('')
    setPeriodo('MENSUAL')
    setMes(pad(NOW.getMonth() + 1))
    setAnio(String(NOW.getFullYear()))
    setSemana('1')
    setBase('')
    setDescontar(true)
    setPlantilla('personalizado')
    setPartidas([])
    setErr(null)
  }

  function aplicarPlantilla(value: string) {
    setPlantilla(value)
    if (value === 'regla') {
      const d = Math.max(0, disponibleForm)
      setPartidas([
        nuevaFila('libre', 'Necesidades (50%)', String(round2(d * 0.5))),
        nuevaFila('libre', 'Deseos (30%)', String(round2(d * 0.3))),
        nuevaFila('libre', 'Ahorro (20%)', String(round2(d * 0.2))),
      ])
    } else if (value === 'basico') {
      setPartidas(
        ['Alimentación', 'Vivienda', 'Transporte', 'Ocio', 'Ahorro'].map((n) =>
          nuevaFila('libre', n, ''),
        ),
      )
    }
  }

  function updatePartida(key: string, patch: Partial<PartidaForm>) {
    setPartidas((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  function startEdit(p: PresupuestoResponse) {
    setEditId(p.id)
    setNombre(p.nombre)
    setPeriodo(p.periodo)
    setMes(pad(p.mes))
    setAnio(String(p.anio))
    setSemana(String(p.semana ?? 1))
    setBase(String(p.cantidadBase))
    setDescontar(p.descontarGastosFijos)
    setPlantilla('personalizado')
    setPartidas(
      p.partidas.map((pa) =>
        pa.categoriaId != null
          ? { key: `p${keySeq++}`, tipo: 'categoria', categoriaId: String(pa.categoriaId), nombre: '', importe: String(pa.importe) }
          : { key: `p${keySeq++}`, tipo: 'libre', categoriaId: '', nombre: pa.nombre ?? '', importe: String(pa.importe) },
      ),
    )
    setErr(null)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function onDelete(p: PresupuestoResponse) {
    const ok = await confirm({
      title: 'Eliminar presupuesto',
      message: `¿Seguro que quieres eliminar "${p.nombre}"?`,
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync(p.id)
      if (editId === p.id) resetForm()
      notifyOk('Presupuesto eliminado')
    } catch (e) {
      notifyError(e)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const nom = nombre.trim()
    if (!nom) return setErr('Indica un nombre para el presupuesto.')

    const dtoPartidas: PartidaDTO[] = []
    for (const p of partidas) {
      const importe = num(p.importe)
      if (p.tipo === 'categoria') {
        if (!p.categoriaId) {
          // fila vacía sin categoría: la ignoramos si además no tiene importe
          if (importe === 0) continue
          return setErr('Selecciona la categoría de todas las partidas o elimínalas.')
        }
        dtoPartidas.push({ categoriaId: Number(p.categoriaId), nombre: null, importe })
      } else {
        if (!p.nombre.trim()) {
          if (importe === 0) continue
          return setErr('Pon nombre a todas las líneas libres o elimínalas.')
        }
        dtoPartidas.push({ categoriaId: null, nombre: p.nombre.trim(), importe })
      }
    }
    if (dtoPartidas.length === 0) return setErr('Añade al menos una partida al presupuesto.')

    const body = {
      nombre: nom,
      periodo,
      anio: anioN,
      mes: mesN,
      semana: periodo === 'SEMANAL' ? Number(semana) : null,
      cantidadBase: num(base),
      descontarGastosFijos: descontar,
      partidas: dtoPartidas,
    }
    try {
      if (editId) await actualizar.mutateAsync({ id: editId, ...body })
      else await crear.mutateAsync(body)
      notifyOk(editId ? 'Presupuesto actualizado' : 'Presupuesto creado')
      resetForm()
    } catch (e) {
      notifyError(e)
    }
  }

  const cargando =
    presupuestos.isLoading || categorias.isLoading || rec.isLoading || deu.isLoading

  return (
    <div>
      <div className={s.header}>
        <h1>Presupuestos</h1>
        <p>
          Reparte tu dinero por partidas y compáralo con el gasto real. El dinero
          disponible es la cantidad que introduces menos tus gastos fijos del mes.
        </p>
      </div>

      <div className={s.banner}>
        <div className={s.bannerIcon}>
          <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.06 1.578h1.9c-.164-1.6-1.532-2.769-3.96-2.93V1H7.591v1.140c-2.08.169-3.487 1.438-3.487 3.161 0 1.454.98 2.442 2.914 2.933l.573.156v4.325c-1.148-.186-1.928-.809-2.11-1.72H4zm3.591-3.234c-1.083-.263-1.687-.86-1.687-1.72 0-.985.769-1.72 1.874-1.849v3.593zm1.079 1.375c1.243.302 1.867.867 1.867 1.877 0 1.176-.891 1.951-2.297 2.02V8.803z" /></svg>
        </div>
        <div className={s.bannerText}>
          Gastos fijos de <strong>{MESES[NOW.getMonth()]}</strong>:{' '}
          <strong>{formatEur(gfTotal, true)}</strong> (suscripciones + recurrentes
          mensuales + cuotas de deuda). En los presupuestos que descuentan gastos
          fijos, el disponible = cantidad introducida − esta cifra.
        </div>
      </div>

      {cargando ? (
        <div className={s.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={s.card}>
              <Skeleton width={160} height={20} />
              <Skeleton width="100%" height={90} style={{ marginTop: 12, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : presupuestos.isError ? (
        <p className={s.error}>{apiErrorMessage(presupuestos.error)}</p>
      ) : (presupuestos.data ?? []).length === 0 ? (
        <EmptyState
          message="Aún no tienes presupuestos. Crea el primero con el formulario de abajo."
          actionLabel="Crear mi primer presupuesto"
          onAction={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        />
      ) : (
        <div className={s.grid}>
          {(presupuestos.data ?? []).map((p) => (
            <BudgetCard
              key={p.id}
              p={p}
              movimientos={movimientos.data ?? []}
              gfTotal={gfTotal}
              onEdit={startEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <form ref={formRef} className={`card ${s.cardBlock}`} onSubmit={submit} noValidate style={{ marginTop: '1.25rem' }}>
        <div className="sec-title">{editId ? 'Editar presupuesto' : 'Nuevo presupuesto'}</div>

        <div className={s.row}>
          <div className={s.field}>
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Ej: Presupuesto de octubre"
              value={nombre}
              aria-invalid={!!err && !nombre.trim()}
              onChange={(e) => { setNombre(e.target.value); setErr(null) }}
            />
          </div>
          <div className={s.field}>
            <label>Periodo</label>
            <Select value={periodo} options={PERIODOS} onChange={setPeriodo} ariaLabel="Periodo" />
          </div>
          <div className={s.field}>
            <label>Mes</label>
            <Select
              value={mes}
              options={MESES.map((m, i) => ({ value: pad(i + 1), label: m }))}
              onChange={setMes}
              ariaLabel="Mes"
            />
          </div>
          <div className={s.field}>
            <label>Año</label>
            <Select
              value={anio}
              options={ANIOS.map((y) => ({ value: y, label: y }))}
              onChange={setAnio}
              ariaLabel="Año"
            />
          </div>
          {periodo === 'SEMANAL' && (
            <div className={s.field}>
              <label>Semana del mes</label>
              <Select
                value={semana}
                options={Array.from({ length: semanas }, (_, i) => ({
                  value: String(i + 1),
                  label: `Semana ${i + 1} (días ${rangoSemana(i + 1, anioN, mesN)})`,
                }))}
                onChange={setSemana}
                ariaLabel="Semana del mes"
              />
            </div>
          )}
        </div>

        <div className={s.row}>
          <div className={s.field}>
            <label>Cantidad a presupuestar</label>
            <MoneyInput
              step="0.01"
              min="0"
              placeholder="0,00"
              value={base}
              onChange={(e) => { setBase(e.target.value); setErr(null) }}
            />
          </div>
          <div className={s.field}>
            <label>Plantilla típica</label>
            <Select value={plantilla} options={PLANTILLAS} onChange={aplicarPlantilla} ariaLabel="Plantilla" />
          </div>
          <div className={s.field} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={descontar}
                onChange={(e) => setDescontar(e.target.checked)}
              />
              Descontar gastos fijos {periodo === 'SEMANAL' ? '(parte semanal)' : 'del mes'}
            </label>
          </div>
        </div>

        <div className={s.partidaEditor}>
          {partidas.map((p) => (
            <div key={p.key} className={s.partidaEditRow}>
              <Select
                value={p.tipo}
                options={[
                  { value: 'categoria', label: 'Categoría' },
                  { value: 'libre', label: 'Línea libre' },
                ]}
                onChange={(v) => updatePartida(p.key, { tipo: v as 'categoria' | 'libre' })}
                ariaLabel="Tipo de partida"
              />
              {p.tipo === 'categoria' ? (
                <Select
                  value={p.categoriaId}
                  options={catOptions}
                  placeholder={catOptions.length ? 'Selecciona categoría' : 'Sin categorías de gasto'}
                  onChange={(v) => updatePartida(p.key, { categoriaId: v })}
                  ariaLabel="Categoría de la partida"
                />
              ) : (
                <div className={s.field}>
                  <input
                    type="text"
                    placeholder="Nombre de la partida"
                    value={p.nombre}
                    onChange={(e) => updatePartida(p.key, { nombre: e.target.value })}
                  />
                </div>
              )}
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={p.importe}
                onChange={(e) => updatePartida(p.key, { importe: e.target.value })}
              />
              <button
                type="button"
                className={s.removeBtn}
                aria-label="Quitar partida"
                title="Quitar"
                onClick={() => setPartidas((prev) => prev.filter((x) => x.key !== p.key))}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z" /></svg>
              </button>
            </div>
          ))}
          <div className={s.addRow}>
            <button
              type="button"
              className={s.btnGhost}
              onClick={() => setPartidas((prev) => [...prev, nuevaFila('categoria')])}
            >
              + Partida por categoría
            </button>
            <button
              type="button"
              className={s.btnGhost}
              onClick={() => setPartidas((prev) => [...prev, nuevaFila('libre')])}
            >
              + Línea libre
            </button>
          </div>
        </div>

        <div className={s.summaryBar}>
          <span>Disponible: <b>{formatEur(disponibleForm, true)}</b></span>
          <span>Asignado: <b>{formatEur(asignado, true)}</b></span>
          <span className={sinAsignar < 0 ? s.neg : ''}>
            Sin asignar: <b>{formatEur(sinAsignar, true)}</b>
          </span>
        </div>

        {err && <div className={s.error}>{err}</div>}

        <div className={s.formActions}>
          <button className={s.btn} type="submit" disabled={crear.isPending || actualizar.isPending}>
            {crear.isPending || actualizar.isPending
              ? 'Guardando…'
              : editId
                ? 'Guardar cambios'
                : 'Crear presupuesto'}
          </button>
          {editId && (
            <button type="button" className={s.btnCancel} onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
