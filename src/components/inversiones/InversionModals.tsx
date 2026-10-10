import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import CategoriaSelect from '@/components/ui/CategoriaSelect'
import {
  useActualizarInversion,
  useAsignarCuentaInversion,
  useCategorias,
  useCrearCategoria,
  useCrearInversion,
  useCuentasInversion,
  useEliminarInversion,
} from '@/hooks/useFinance'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { notifyError, notifyOk } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import type { InversionResponse } from '@/types/api'
import { SIN_CUENTA, nombreActivo, num } from './common'
import s from '@/pages/Inversiones.module.css'

/** Ids de los formularios de cada modal: el botón de guardar vive en el footer. */
const FORM_NUEVA = 'form-inversion-nueva'
const FORM_EDITAR = 'form-inversion-editar'

type Err = { field: string; msg: string } | null

function useOpcionesCuenta() {
  const { data: cuentas } = useCuentasInversion()
  const opciones = useMemo(
    () => [
      { value: SIN_CUENTA, label: 'Sin cuenta' },
      ...(cuentas ?? []).map((c) => ({ value: String(c.id), label: c.nombre })),
    ],
    [cuentas],
  )
  const efectivoDe = (id: string) =>
    (cuentas ?? []).find((c) => String(c.id) === id)?.efectivo ?? 0
  const nombreDe = (id: string) => (cuentas ?? []).find((c) => String(c.id) === id)?.nombre ?? ''
  return { opciones, efectivoDe, nombreDe }
}

/** Casilla "descontar del efectivo" con el disponible de la cuenta. */
function DesdeEfectivo({
  checked,
  onChange,
  cuentaNombre,
  disponible,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  cuentaNombre: string
  disponible: number
}) {
  return (
    <label className={s.check}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Descontar del efectivo de {cuentaNombre}
        <small>
          Disponible: {formatEur(disponible)}. Desmárcalo si solo estás registrando una posición
          que ya tenías.
        </small>
      </span>
    </label>
  )
}

// ── Nueva inversión ──────────────────────────────────────────────────────

export function NuevaInversionModal({
  open,
  onClose,
  cuentaIdInicial,
  categoriaInicial,
}: {
  open: boolean
  onClose: () => void
  /** Cuenta preseleccionada (al abrir desde el detalle de una cuenta). */
  cuentaIdInicial?: number | null
  /** Categoría preseleccionada (al añadir desde un grupo de la vista por categoría). */
  categoriaInicial?: string | null
}) {
  const { data: categorias } = useCategorias()
  const crearInversion = useCrearInversion()
  const crearCategoria = useCrearCategoria()
  const { opciones, efectivoDe, nombreDe } = useOpcionesCuenta()

  const invCats = useMemo(
    () => (categorias ?? []).filter((c) => c.tipo === 'INVERSION'),
    [categorias],
  )

  const [cuentaId, setCuentaId] = useState<string>(SIN_CUENTA)
  const [catName, setCatName] = useState('')
  const [activo, setActivo] = useState('')
  const [aportado, setAportado] = useState('')
  const [total, setTotal] = useState('')
  const [desdeEfectivo, setDesdeEfectivo] = useState(false)
  const [err, setErr] = useState<Err>(null)

  useEffect(() => {
    if (!open) return
    const inicial = cuentaIdInicial ? String(cuentaIdInicial) : SIN_CUENTA
    setCuentaId(inicial)
    setDesdeEfectivo(inicial !== SIN_CUENTA && efectivoDe(inicial) > 0)
    setCatName(categoriaInicial ?? '')
    setActivo('')
    setAportado('')
    setTotal('')
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cuentaIdInicial, categoriaInicial])

  const saving = crearInversion.isPending || crearCategoria.isPending
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  async function submit(e: FormEvent) {
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
    const conCuenta = cuentaId !== SIN_CUENTA
    const descontar = conCuenta && desdeEfectivo
    if (descontar && a > efectivoDe(cuentaId))
      return setErr({
        field: 'aportado',
        msg: `Solo hay ${formatEur(efectivoDe(cuentaId))} de efectivo en ${nombreDe(cuentaId)}.`,
      })
    try {
      // Reutiliza la categoría si ya existe (por nombre); si no, la crea.
      const existing = invCats.find((c) => c.nombre.toLowerCase() === name.toLowerCase())
      const categoriaId =
        existing?.id ??
        (await crearCategoria.mutateAsync({ nombre: name, tipo: 'INVERSION' })).id
      await crearInversion.mutateAsync({
        categoriaId,
        nombre: activo.trim() || null,
        capitalAportado: a,
        capitalTotal: tot,
        cuentaId: conCuenta ? Number(cuentaId) : null,
        desdeEfectivo: descontar,
      })
      notifyOk('Inversión creada')
      onClose()
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={520}
      title="Nueva inversión"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className={s.btn} type="submit" form={FORM_NUEVA} disabled={saving}>
            {saving ? 'Guardando…' : 'Añadir inversión'}
          </button>
        </>
      }
    >
      <form id={FORM_NUEVA} onSubmit={submit} noValidate>
        <div className={s.row}>
          <div className={s.field}>
            <label>Cuenta</label>
            <Select<string>
              value={cuentaId}
              options={opciones}
              onChange={(v) => {
                setCuentaId(v)
                setDesdeEfectivo(v !== SIN_CUENTA && efectivoDe(v) > 0)
                setErr(null)
              }}
            />
          </div>
        </div>
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
            <label htmlFor="inv-activo">Activo</label>
            <input
              id="inv-activo"
              value={activo}
              maxLength={120}
              placeholder="Ej.: MSCI World"
              onChange={(e) => setActivo(e.target.value)}
            />
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
        {cuentaId !== SIN_CUENTA && (
          <DesdeEfectivo
            checked={desdeEfectivo}
            onChange={setDesdeEfectivo}
            cuentaNombre={nombreDe(cuentaId)}
            disponible={efectivoDe(cuentaId)}
          />
        )}
        <p className={s.hint}>
          Si la categoría no existe, se crea automáticamente (tipo Inversión).
        </p>
      </form>
    </Modal>
  )
}

// ── Actualizar inversión ─────────────────────────────────────────────────

export function EditarInversionModal({
  inversion,
  onClose,
  onSeparar,
}: {
  /** Posición a editar; null = cerrado. */
  inversion: InversionResponse | null
  onClose: () => void
  /** Abre el reparto de la posición en varias cuentas/activos. */
  onSeparar?: (i: InversionResponse) => void
}) {
  const actualizarInversion = useActualizarInversion()
  const asignarCuenta = useAsignarCuentaInversion()
  const { borrar, isPending: borrando } = useBorrarPosicion()
  const { opciones, efectivoDe, nombreDe } = useOpcionesCuenta()

  const [cuentaId, setCuentaId] = useState<string>(SIN_CUENTA)
  const [activo, setActivo] = useState('')
  const [aportacion, setAportacion] = useState('')
  const [valor, setValor] = useState('')
  const [desdeEfectivo, setDesdeEfectivo] = useState(false)
  const [err, setErr] = useState<Err>(null)

  const cuentaOriginal = inversion?.cuentaId ? String(inversion.cuentaId) : SIN_CUENTA

  useEffect(() => {
    if (!inversion) return
    setCuentaId(cuentaOriginal)
    setActivo(inversion.nombre ?? '')
    setAportacion('')
    setValor('')
    setDesdeEfectivo(cuentaOriginal !== SIN_CUENTA && efectivoDe(cuentaOriginal) > 0)
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inversion?.id])

  const saving = actualizarInversion.isPending || asignarCuenta.isPending || borrando
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    if (!inversion) return
    const ap = num(aportacion)
    const val = num(valor)
    const hasAp = !Number.isNaN(ap)
    const hasVal = !Number.isNaN(val)
    const cambiaCuenta = cuentaId !== cuentaOriginal
    const cambiaNombre = activo.trim() !== (inversion.nombre ?? '').trim()
    if (!hasAp && !hasVal && !cambiaCuenta && !cambiaNombre)
      return setErr({
        field: 'updAportacion',
        msg: 'Indica una nueva aportación, un valor actual o cambia la cuenta o el activo.',
      })
    if (hasAp && ap < 0)
      return setErr({ field: 'updAportacion', msg: 'La aportación no puede ser negativa.' })
    if (hasVal && val < 0)
      return setErr({ field: 'updValor', msg: 'El valor actual no puede ser negativo.' })
    const descontar = hasAp && ap > 0 && cuentaId !== SIN_CUENTA && desdeEfectivo
    if (descontar && ap > efectivoDe(cuentaId))
      return setErr({
        field: 'updAportacion',
        msg: `Solo hay ${formatEur(efectivoDe(cuentaId))} de efectivo en ${nombreDe(cuentaId)}.`,
      })
    try {
      // Primero la cuenta: así una aportación "desde efectivo" sale de la nueva.
      if (cambiaCuenta) {
        await asignarCuenta.mutateAsync({
          id: inversion.id,
          cuentaId: cuentaId === SIN_CUENTA ? null : Number(cuentaId),
        })
      }
      if (hasAp || hasVal || cambiaNombre) {
        await actualizarInversion.mutateAsync({
          id: inversion.id,
          ...(hasAp ? { aportacion: ap } : {}),
          ...(hasVal ? { valorActual: val } : {}),
          ...(cambiaNombre ? { nombre: activo.trim() } : {}),
          desdeEfectivo: descontar,
        })
      }
      notifyOk('Inversión actualizada')
      onClose()
    } catch (error) {
      notifyError(error)
    }
  }

  const apNum = num(aportacion)

  return (
    <Modal
      open={inversion !== null}
      onClose={onClose}
      maxWidth={520}
      title={`Actualizar ${inversion ? nombreActivo(inversion) : 'inversión'}`}
      footer={
        <div className={s.footSplit}>
          <div className={s.headActions}>
            <button
              type="button"
              className={s.btnDanger}
              disabled={saving}
              onClick={async () => {
                if (inversion && (await borrar(inversion))) onClose()
              }}
            >
              Eliminar
            </button>
            {onSeparar && inversion && Number(inversion.capitalTotal) > 0 && (
              <button
                type="button"
                className={s.btnGhost}
                disabled={saving}
                onClick={() => onSeparar(inversion)}
              >
                Separar…
              </button>
            )}
          </div>
          <div className={s.headActions}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_EDITAR} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      }
    >
      <form id={FORM_EDITAR} onSubmit={submit} noValidate>
        <div className={s.row}>
          <div className={s.field}>
            <label>Cuenta</label>
            <Select<string>
              value={cuentaId}
              options={opciones}
              onChange={(v) => {
                setCuentaId(v)
                setDesdeEfectivo(v !== SIN_CUENTA && efectivoDe(v) > 0)
                setErr(null)
              }}
            />
          </div>
          <div className={s.field}>
            <label htmlFor="upd-activo">Activo</label>
            <input
              id="upd-activo"
              value={activo}
              maxLength={120}
              placeholder={inversion?.categoriaNombre ?? 'Ej.: MSCI World'}
              onChange={(e) => {
                setActivo(e.target.value)
                setErr(null)
              }}
            />          </div>
        </div>
        <div className={s.row}>
          <div className={s.field}>
            <label>Nueva aportación</label>
            <MoneyInput
              step="0.01"
              min="0"
              placeholder="Opcional"
              value={aportacion}
              aria-invalid={err?.field === 'updAportacion'}
              onChange={(e) => {
                setAportacion(e.target.value)
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
              value={valor}
              aria-invalid={err?.field === 'updValor'}
              onChange={(e) => {
                setValor(e.target.value)
                setErr(null)
              }}
            />
            {fieldErr('updValor')}
          </div>
        </div>
        {cuentaId !== SIN_CUENTA && !Number.isNaN(apNum) && apNum > 0 && (
          <DesdeEfectivo
            checked={desdeEfectivo}
            onChange={setDesdeEfectivo}
            cuentaNombre={nombreDe(cuentaId)}
            disponible={efectivoDe(cuentaId)}
          />
        )}
        <p className={s.hint}>
          La aportación se suma al capital; el valor actual fija el total del momento (la
          plusvalía se calcula sola). Cambiar de cuenta no mueve dinero.
        </p>
      </form>
    </Modal>
  )
}

// ── Eliminar posición ────────────────────────────────────────────────────

/** Confirmación + borrado de una posición. */
export function useBorrarPosicion() {
  const confirm = useConfirm()
  const eliminar = useEliminarInversion()
  async function borrar(inv: InversionResponse) {
    const nombre = nombreActivo(inv)
    const ok = await confirm({
      title: 'Eliminar inversión',
      message: (
        <>
          ¿Seguro que quieres eliminar la inversión <strong>{nombre}</strong>? No se puede
          deshacer.
          {inv.cuentaId && (
            <> Los movimientos de efectivo que ya generó en {inv.cuentaNombre} se mantienen.</>
          )}
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return false
    try {
      await eliminar.mutateAsync(inv.id)
      notifyOk('Inversión eliminada')
      return true
    } catch (err) {
      notifyError(err)
      return false
    }
  }
  return { borrar, isPending: eliminar.isPending }
}
