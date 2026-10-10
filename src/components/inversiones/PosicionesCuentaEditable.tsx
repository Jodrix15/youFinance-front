import { useMemo, useState } from 'react'
import { useInversiones } from '@/hooks/useFinance'
import EmptyState from '@/components/ui/EmptyState'
import type { InversionResponse } from '@/types/api'
import PosicionesTabla from './PosicionesTabla'
import { EditarInversionModal, NuevaInversionModal, useBorrarPosicion } from './InversionModals'
import s from '@/pages/Inversiones.module.css'

/**
 * Posiciones de una cuenta de inversión con edición (en la página de
 * movimientos de la cuenta). En Inversiones y en el detalle de la cuenta las
 * tablas son solo informativas: aquí es donde se editan.
 */
export default function PosicionesCuentaEditable({ cuentaId }: { cuentaId: number }) {
  const { data: inversiones } = useInversiones()
  const { borrar, isPending } = useBorrarPosicion()
  const [editando, setEditando] = useState<InversionResponse | null>(null)
  const [nuevaOpen, setNuevaOpen] = useState(false)

  const posiciones = useMemo(
    () => (inversiones ?? []).filter((i) => i.cuentaId === cuentaId),
    [inversiones, cuentaId],
  )

  return (
    <div className={`card ${s.cardBlock}`}>
      <div className="block-head">
        <div className="sec-title">Posiciones</div>
        <button type="button" className={s.btnGhost} onClick={() => setNuevaOpen(true)}>
          + Añadir posición
        </button>
      </div>
      {posiciones.length === 0 ? (
        <EmptyState
          message="Esta cuenta aún no tiene posiciones."
          actionLabel="Añadir la primera"
          onAction={() => setNuevaOpen(true)}
        />
      ) : (
        <PosicionesTabla
          items={posiciones}
          extra={{ label: 'Categoría', value: (i) => i.categoriaNombre ?? '—' }}
          onEdit={setEditando}
          onDelete={borrar}
          disabled={isPending}
        />
      )}
      <NuevaInversionModal open={nuevaOpen} onClose={() => setNuevaOpen(false)} cuentaIdInicial={cuentaId} />
      <EditarInversionModal inversion={editando} onClose={() => setEditando(null)} />
    </div>
  )
}
