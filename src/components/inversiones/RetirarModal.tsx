import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import { useCuentas, useRetirarDeCuenta } from '@/hooks/useFinance'
import { notifyError, notifyOk } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import type { CuentaInversionResponse, InversionResponse } from '@/types/api'
import { hoyISO, nombreActivo, num } from './common'
import s from '@/pages/Inversiones.module.css'

const FORM_ID = 'form-retirada'
const EFECTIVO = 'efectivo'

/**
 * Retirada = transferencia de la cuenta de inversión a una corriente. Si el
 * dinero sale de una posición, antes se vende esa parte (pasa a efectivo).
 */
export default function RetirarModal({
  open,
  onClose,
  cuenta,
  posiciones,
}: {
  open: boolean
  onClose: () => void
  cuenta: CuentaInversionResponse
  posiciones: InversionResponse[]
}) {
  const { data: cuentas } = useCuentas()
  const retirar = useRetirarDeCuenta()
  const corrientes = useMemo(
    () => (cuentas ?? []).filter((c) => c.tipo !== 'INVERSION'),
    [cuentas],
  )

  const [origen, setOrigen] = useState<string>(EFECTIVO)
  const [importe, setImporte] = useState('')
  const [destino, setDestino] = useState<string>('')
  const [fecha, setFecha] = useState(hoyISO())
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)

  useEffect(() => {
    if (!open) return
    setOrigen(EFECTIVO)
    setImporte('')
    setFecha(hoyISO())
    setErr(null)
    const porDefecto = cuenta.cuentaVinculadaId ?? corrientes[0]?.id
    setDestino(porDefecto ? String(porDefecto) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const maximo =
    origen === EFECTIVO
      ? cuenta.efectivo
      : (posiciones.find((p) => String(p.id) === origen)?.capitalTotal ?? 0)

  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const imp = num(importe)
    if (Number.isNaN(imp) || imp <= 0)
      return setErr({ field: 'importe', msg: 'El importe debe ser mayor que 0.' })
    if (imp > maximo)
      return setErr({ field: 'importe', msg: `Como máximo puedes retirar ${formatEur(maximo)}.` })
    if (!destino) return setErr({ field: 'destino', msg: 'Elige la cuenta de destino.' })
    if (!fecha) return setErr({ field: 'fecha', msg: 'Indica la fecha.' })
    try {
      await retirar.mutateAsync({
        cuentaId: cuenta.id,
        ...(origen !== EFECTIVO ? { inversionId: Number(origen) } : {}),
        cuentaDestinoId: Number(destino),
        importe: imp,
        fecha,
      })
      notifyOk('Retirada registrada')
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
      title={`Retirar de ${cuenta.nombre}`}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={retirar.isPending}>
            Cancelar
          </button>
          <button className={s.btn} type="submit" form={FORM_ID} disabled={retirar.isPending}>
            {retirar.isPending ? 'Guardando…' : 'Retirar'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate>
        <div className={s.row}>
          <div className={s.field}>
            <label>Desde</label>
            <Select<string>
              value={origen}
              onChange={(v) => {
                setOrigen(v)
                setErr(null)
              }}
              options={[
                { value: EFECTIVO, label: `Efectivo (${formatEur(cuenta.efectivo)})` },
                ...posiciones.map((p) => ({
                  value: String(p.id),
                  label: `${nombreActivo(p)} (${formatEur(p.capitalTotal)})`,
                })),
              ]}
            />
          </div>
          <div className={s.field}>
            <label>Importe</label>
            <MoneyInput
              step="0.01"
              min="0"
              placeholder="0,00"
              value={importe}
              aria-invalid={err?.field === 'importe'}
              onChange={(e) => {
                setImporte(e.target.value)
                setErr(null)
              }}
            />
            {fieldErr('importe')}
          </div>
        </div>
        <div className={s.row}>
          <div className={s.field}>
            <label>A la cuenta</label>
            <Select<string>
              value={destino}
              invalid={err?.field === 'destino'}
              placeholder="Elige una cuenta"
              onChange={(v) => {
                setDestino(v)
                setErr(null)
              }}
              options={corrientes.map((c) => ({ value: String(c.id), label: c.nombreCuenta }))}
            />
            {fieldErr('destino')}
          </div>
          <div className={s.field}>
            <label htmlFor="ret-fecha">Fecha</label>
            <input
              id="ret-fecha"
              type="date"
              value={fecha}
              aria-invalid={err?.field === 'fecha'}
              onChange={(e) => setFecha(e.target.value)}
            />
            {fieldErr('fecha')}
          </div>
        </div>
        <p className={s.hint}>
          {origen === EFECTIVO
            ? 'Se registra como una transferencia a la cuenta elegida.'
            : 'Primero se vende esa parte de la posición (el aportado baja en la misma proporción) y después se transfiere a la cuenta elegida.'}
        </p>
      </form>
    </Modal>
  )
}
