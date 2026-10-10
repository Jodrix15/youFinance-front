import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import ColorPicker from '@/components/ui/ColorPicker'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import {
  useActualizarCuenta,
  useCrearCuenta,
  useCuentas,
  useEliminarCuenta,
} from '@/hooks/useFinance'
import { notifyError, notifyOk } from '@/lib/notify'
import { PALETTE } from '@/lib/chartSetup'
import type { CuentaResponse, PlataformaInversion } from '@/types/api'
import { PLATAFORMAS, num } from './common'
import s from '@/pages/Inversiones.module.css'

const FORM_ID = 'form-cuenta-inversion'
const NINGUNA = ''

type Props = {
  open: boolean
  onClose: () => void
  /** Cuenta a editar; sin ella, el modal crea una nueva. */
  cuenta?: CuentaResponse | null
  /** Tras eliminar la cuenta (solo en edición). */
  onDeleted?: () => void
}

/** Alta y edición de una cuenta de inversión (Mintos, un broker…). */
export default function CuentaInversionModal({ open, onClose, cuenta, onDeleted }: Props) {
  const { data: cuentas } = useCuentas()
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta()
  const eliminar = useEliminarCuenta()
  const confirm = useConfirm()
  const editando = !!cuenta

  const corrientes = useMemo(
    () => (cuentas ?? []).filter((c) => c.tipo !== 'INVERSION'),
    [cuentas],
  )
  const coloresUsados = useMemo(
    () =>
      (cuentas ?? [])
        .filter((c) => c.tipo === 'INVERSION' && c.id !== cuenta?.id && c.color)
        .map((c) => c.color as string),
    [cuentas, cuenta?.id],
  )

  const [nombre, setNombre] = useState('')
  const [plataforma, setPlataforma] = useState<PlataformaInversion | null>(null)
  const [color, setColor] = useState<string | null>(null)
  const [efectivo, setEfectivo] = useState('')
  const [vinculada, setVinculada] = useState<string>(NINGUNA)
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)

  // Rellena el formulario al abrir.
  useEffect(() => {
    if (!open) return
    setErr(null)
    if (cuenta) {
      setNombre(cuenta.nombreCuenta)
      setPlataforma(cuenta.plataforma)
      setColor(cuenta.color)
      setEfectivo(String(cuenta.saldoInicial ?? 0))
      setVinculada(cuenta.cuentaVinculadaId ? String(cuenta.cuentaVinculadaId) : NINGUNA)
    } else {
      setNombre('')
      setPlataforma(null)
      // Primer color de la paleta que no use otra cuenta de inversión.
      const usados = new Set(coloresUsados.map((c) => c.toLowerCase()))
      setColor(PALETTE.find((c) => !usados.has(c)) ?? PALETTE[0])
      setEfectivo('')
      setVinculada(corrientes.length === 1 ? String(corrientes[0].id) : NINGUNA)
    }
    // Solo al abrir: no resetear mientras el usuario edita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cuenta?.id])

  const saving = crear.isPending || actualizar.isPending || eliminar.isPending
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const n = nombre.trim()
    const ef = efectivo.trim() === '' ? 0 : num(efectivo)
    if (!n) return setErr({ field: 'nombre', msg: 'Indica un nombre.' })
    if (Number.isNaN(ef) || ef < 0)
      return setErr({ field: 'efectivo', msg: 'El efectivo no puede ser negativo.' })
    const body = {
      nombreCuenta: n,
      saldoInicial: ef,
      tipo: 'INVERSION' as const,
      plataforma,
      color,
      cuentaVinculadaId: vinculada === NINGUNA ? null : Number(vinculada),
    }
    try {
      if (cuenta) {
        await actualizar.mutateAsync({ id: cuenta.id, ...body })
        notifyOk('Cuenta actualizada')
      } else {
        await crear.mutateAsync(body)
        notifyOk('Cuenta creada')
      }
      onClose()
    } catch (error) {
      notifyError(error)
    }
  }

  async function handleDelete() {
    if (!cuenta) return
    const ok = await confirm({
      title: 'Eliminar cuenta',
      message: (
        <>
          ¿Seguro que quieres eliminar <strong>{cuenta.nombreCuenta}</strong>? Solo se puede
          si no tiene posiciones ni movimientos.
        </>
      ),
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminar.mutateAsync(cuenta.id)
      notifyOk('Cuenta eliminada')
      onClose()
      onDeleted?.()
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidth={520}
      title={editando ? `Editar ${cuenta?.nombreCuenta}` : 'Nueva cuenta de inversión'}
      footer={
        <div className={s.footSplit}>
          <div>
            {editando && (
              <button type="button" className={s.btnDanger} onClick={handleDelete} disabled={saving}>
                Eliminar cuenta
              </button>
            )}
          </div>
          <div className={s.headActions}>
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className={s.btn} type="submit" form={FORM_ID} disabled={saving}>
              {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </div>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className={s.row}>
          <div className={s.field}>
            <label htmlFor="ci-nombre">Nombre</label>
            <input
              id="ci-nombre"
              value={nombre}
              placeholder="Mintos, MyInvestor, Trade Republic…"
              aria-invalid={err?.field === 'nombre'}
              onChange={(e) => {
                setNombre(e.target.value)
                setErr(null)
              }}
            />
            {fieldErr('nombre')}
          </div>
        </div>

        <div className={s.field} style={{ marginBottom: 12 }}>
          <label>Tipo</label>
          <div className={s.segs}>
            {PLATAFORMAS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={s.seg}
                aria-pressed={plataforma === p.value}
                onClick={() => setPlataforma(plataforma === p.value ? null : p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.field} style={{ marginBottom: 12 }}>
          <label>Color</label>
          <ColorPicker value={color} onChange={setColor} usados={coloresUsados} />
        </div>

        <div className={s.row}>
          <div className={s.field}>
            <label>{editando ? 'Efectivo inicial' : 'Efectivo sin invertir'}</label>
            <MoneyInput
              step="0.01"
              min="0"
              placeholder="0,00"
              value={efectivo}
              aria-invalid={err?.field === 'efectivo'}
              onChange={(e) => {
                setEfectivo(e.target.value)
                setErr(null)
              }}
            />
            {fieldErr('efectivo')}
          </div>
          <div className={s.field}>
            <label>Cuenta bancaria vinculada</label>
            <Select<string>
              value={vinculada}
              onChange={setVinculada}
              options={[
                { value: NINGUNA, label: 'Ninguna' },
                ...corrientes.map((c) => ({ value: String(c.id), label: c.nombreCuenta })),
              ]}
            />
          </div>
        </div>
        <p className={s.hint}>
          {editando
            ? 'El efectivo inicial es el de partida; el actual cambia con transferencias, rendimientos, aportaciones y retiradas.'
            : 'El dinero que ya tienes en la plataforma sin invertir. Después cambia con transferencias, rendimientos, aportaciones y retiradas.'}{' '}
          La cuenta vinculada se propone por defecto al retirar.
        </p>
      </form>
    </Modal>
  )
}
