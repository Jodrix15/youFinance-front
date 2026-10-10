import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import { useCuentasInversion, useInversiones, useRepartirInversion } from '@/hooks/useFinance'
import { notifyError, notifyOk } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import type { InversionResponse } from '@/types/api'
import PosicionesTabla from './PosicionesTabla'
import { useBorrarPosicion } from './InversionModals'
import { nombreActivo, num } from './common'
import s from '@/pages/Inversiones.module.css'

const FORM_REPARTO = 'form-inversion-reparto'

/** Redondeo a céntimos para comparar sumas sin arrastrar decimales binarios. */
const cent = (n: number) => Math.round(n * 100) / 100

type Tramo = { cuentaId: string; nombre: string; importe: string }

/**
 * Posiciones sin cuenta (anteriores a las cuentas de inversión). Desde aquí se
 * eligen una a una para pasarlas a una cuenta o repartirlas entre varias.
 */
export function SinCuentaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: inversiones } = useInversiones()
  const { data: cuentas } = useCuentasInversion()
  const { borrar, isPending } = useBorrarPosicion()
  const [repartiendo, setRepartiendo] = useState<InversionResponse | null>(null)

  const sinCuenta = useMemo(
    () => (inversiones ?? []).filter((i) => i.cuentaId == null),
    [inversiones],
  )
  const hayCuentas = (cuentas ?? []).length > 0

  // Al quedar todas asignadas no tiene sentido seguir con el modal abierto.
  useEffect(() => {
    if (open && inversiones && sinCuenta.length === 0 && !repartiendo) onClose()
  }, [open, inversiones, sinCuenta.length, repartiendo, onClose])

  return (
    <>
      <Modal
        open={open && !repartiendo}
        onClose={onClose}
        maxWidth={720}
        title="Posiciones sin cuenta"
        footer={
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        }
      >
        {hayCuentas ? (
          <p className={s.hint}>
            Pulsa en una posición para pasarla a una cuenta o separarla en varias: en distintas
            cuentas y/o en activos que ya tengas en su categoría (p. ej. «Acciones» → Apple y
            Microsoft). No se mueve efectivo.
          </p>
        ) : (
          <p className={s.hint}>Crea primero una cuenta de inversión para poder asignarlas.</p>
        )}
        <PosicionesTabla
          items={sinCuenta}
          extra={{ label: 'Categoría', value: (i) => i.categoriaNombre ?? '—' }}
          onEdit={hayCuentas ? setRepartiendo : undefined}
          onDelete={hayCuentas ? borrar : undefined}
          disabled={isPending}
        />
      </Modal>
      <RepartirInversionModal inversion={repartiendo} onClose={() => setRepartiendo(null)} />
    </>
  )
}

/** Reparte el valor actual de una posición entre cuentas y/o activos. */
export function RepartirInversionModal({
  inversion,
  onClose,
}: {
  /** Posición a repartir; null = cerrado. */
  inversion: InversionResponse | null
  onClose: () => void
}) {
  const { data: cuentas } = useCuentasInversion()
  const { data: inversiones } = useInversiones()
  const repartir = useRepartirInversion()
  const [tramos, setTramos] = useState<Tramo[]>([])
  const [err, setErr] = useState<string | null>(null)

  // Una cuenta puede repetirse (varios activos en el mismo broker).
  const opciones = useMemo(
    () => (cuentas ?? []).map((c) => ({ value: String(c.id), label: c.nombre })),
    [cuentas],
  )
  // Activos que ya existen en la misma categoría (un select evita inventar
  // nombres). '' = conservar el de la posición original.
  const opcionesActivo = useMemo(() => {
    if (!inversion) return []
    const propio = nombreActivo(inversion).toLowerCase()
    const nombres = new Map<string, string>()
    ;(inversiones ?? [])
      .filter((i) => i.categoriaId === inversion.categoriaId && i.id !== inversion.id)
      .forEach((i) => {
        const n = nombreActivo(i)
        if (n.toLowerCase() !== propio) nombres.set(n.toLowerCase(), n)
      })
    return [
      { value: '', label: `${nombreActivo(inversion)} (el mismo)` },
      ...[...nombres.values()]
        .sort((a, b) => a.localeCompare(b))
        .map((n) => ({ value: n, label: n })),
    ]
  }, [inversiones, inversion])

  const total = cent(Number(inversion?.capitalTotal ?? 0))
  const aportado = Number(inversion?.capitalAportado ?? 0)

  useEffect(() => {
    if (!inversion) return
    // Por defecto: todo a la primera cuenta (el caso más común).
    const inicial = inversion.cuentaId ? String(inversion.cuentaId) : (opciones[0]?.value ?? '')
    setTramos([{ cuentaId: inicial, nombre: '', importe: String(total) }])
    setErr(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inversion?.id])

  const importes = tramos.map((t) => num(t.importe))
  const repartido = cent(importes.reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0))
  const resto = cent(total - repartido)

  function setTramo(i: number, campo: keyof Tramo, valor: string) {
    setTramos((ts) => ts.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)))
    setErr(null)
  }

  function anadirTramo() {
    // Mismo destino que el último tramo y, de importe, lo que quede sin repartir.
    setTramos((ts) => [
      ...ts,
      {
        cuentaId: ts[ts.length - 1]?.cuentaId ?? opciones[0]?.value ?? '',
        nombre: '',
        importe: resto > 0 ? String(resto) : '',
      },
    ])
    setErr(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!inversion) return
    if (tramos.some((t) => !t.cuentaId)) return setErr('Elige la cuenta de cada tramo.')
    if (importes.some((v) => Number.isNaN(v) || v <= 0))
      return setErr('Cada importe debe ser mayor que 0.')
    if (resto < 0) return setErr(`El reparto supera el valor de la posición (${formatEur(total)}).`)
    try {
      await repartir.mutateAsync({
        id: inversion.id,
        tramos: tramos.map((t, i) => ({
          cuentaId: Number(t.cuentaId),
          nombre: t.nombre.trim() || undefined,
          importe: importes[i],
        })),
      })
      notifyOk(tramos.length > 1 ? 'Posición separada' : 'Posición asignada')
      onClose()
    } catch (error) {
      notifyError(error)
    }
  }

  const saving = repartir.isPending

  return (
    <Modal
      open={inversion !== null}
      onClose={onClose}
      maxWidth={640}
      title={`Asignar o separar ${inversion ? nombreActivo(inversion) : 'posición'}`}
      footer={
        <div className={s.headActions}>
          <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className={s.btn} type="submit" form={FORM_REPARTO} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <form id={FORM_REPARTO} onSubmit={submit} noValidate>
        <p className={s.hint}>
          Valor actual <b>{formatEur(total)}</b> · aportado <b>{formatEur(aportado)}</b>. Indica
          la cuenta, el activo y cuánto valor va a cada parte; el aportado se reparte en la misma
          proporción. Si ese activo ya existe en la cuenta, la parte se suma a él.
        </p>
        {tramos.map((t, i) => (
          <div className={s.row} key={i}>
            <div className={s.field}>
              <label>Cuenta</label>
              <Select<string>
                value={t.cuentaId}
                options={opciones}
                onChange={(v) => setTramo(i, 'cuentaId', v)}
                ariaLabel={`Cuenta del tramo ${i + 1}`}
              />
            </div>
            <div className={s.field}>
              <label>Activo</label>
              <Select<string>
                value={t.nombre}
                options={opcionesActivo}
                onChange={(v) => setTramo(i, 'nombre', v)}
                ariaLabel={`Activo del tramo ${i + 1}`}
              />
            </div>
            <div className={s.field}>
              <label>Valor que pasa</label>
              <MoneyInput
                step="0.01"
                min="0"
                placeholder="0,00"
                value={t.importe}
                onChange={(e) => setTramo(i, 'importe', e.target.value)}
              />
              {tramos.length > 1 && (
                <button
                  type="button"
                  className={s.linkBtn}
                  onClick={() => setTramos((ts) => ts.filter((_, j) => j !== i))}
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className={s.btnGhost} onClick={anadirTramo}>
          + Añadir otra parte
        </button>
        <p className={s.hint}>
          Repartido {formatEur(repartido)} de {formatEur(total)}
          {resto > 0 && (
            <>
              {' '}
              · {formatEur(resto)} se queda {inversion?.cuentaId ? `en ${inversion.cuentaNombre}` : 'sin cuenta'}
            </>
          )}
        </p>
        {err && <div className={s.fieldError}>{err}</div>}
      </form>
    </Modal>
  )
}
