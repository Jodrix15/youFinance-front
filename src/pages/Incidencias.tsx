import { useMemo, useState } from 'react'
import { useActualizarEstadoFeedback, useFeedbackList } from '@/hooks/useFinance'
import { Tabs } from '@/components/ui/Tabs'
import type { FeedbackCategoria, FeedbackEstado } from '@/types/api'

const CAT_LABEL: Record<FeedbackCategoria, string> = {
  INCIDENCIA: 'Error',
  MEJORA: 'Mejora',
  PREGUNTA: 'Duda',
  OTRO: 'Otro',
}

const CAT_COLOR: Record<FeedbackCategoria, string> = {
  INCIDENCIA: 'var(--down)',
  MEJORA: 'var(--accent)',
  PREGUNTA: 'var(--amber)',
  OTRO: 'var(--tx2)',
}

const ESTADOS: { value: FeedbackEstado; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESUELTA', label: 'Resuelta' },
  { value: 'DESCARTADA', label: 'Descartada' },
]

const ESTADO_COLOR: Record<FeedbackEstado, string> = {
  PENDIENTE: 'var(--amber)',
  RESUELTA: 'var(--up)',
  DESCARTADA: 'var(--tx3)',
}

type Filtro = 'TODAS' | FeedbackEstado

export default function Incidencias() {
  const { data, isLoading, isError } = useFeedbackList()
  const actualizar = useActualizarEstadoFeedback()
  const [filtro, setFiltro] = useState<Filtro>('TODAS')

  const lista = useMemo(() => {
    const all = data ?? []
    return filtro === 'TODAS' ? all : all.filter((f) => f.estado === filtro)
  }, [data, filtro])

  const pendientes = (data ?? []).filter((f) => f.estado === 'PENDIENTE').length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Gestión de incidencias</h1>
      <p style={{ color: 'var(--tx2)', marginTop: 4 }}>
        Feedback enviado por los usuarios. {pendientes} pendiente{pendientes === 1 ? '' : 's'}.
      </p>

      <div style={{ margin: '14px 0' }}>
        <Tabs<Filtro>
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'TODAS', label: 'Todas' },
            ...ESTADOS.map((e) => ({ value: e.value as Filtro, label: e.label })),
          ]}
        />
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--tx2)' }}>Cargando…</div>
      ) : isError ? (
        <div style={{ color: 'var(--down)' }}>No se pudo cargar el feedback.</div>
      ) : lista.length === 0 ? (
        <div style={{ color: 'var(--tx2)' }}>No hay feedback en esta vista.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="tbl" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '13%' }}>Fecha</th>
                <th style={{ width: '12%' }}>Usuario</th>
                <th style={{ width: '10%' }}>Tipo</th>
                <th>Mensaje</th>
                <th style={{ width: '15%' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td style={{ color: 'var(--tx2)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(f.fechaCreacion).toLocaleString('es-ES', {
                      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td>{f.usuario ?? '—'}</td>
                  <td>
                    <span style={{ color: CAT_COLOR[f.categoria], fontWeight: 600, fontSize: 12 }}>
                      {CAT_LABEL[f.categoria]}
                    </span>
                  </td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{f.mensaje}</td>
                  <td>
                    <select
                      value={f.estado}
                      disabled={actualizar.isPending}
                      onChange={(e) =>
                        actualizar.mutate({ id: f.id, estado: e.target.value as FeedbackEstado })
                      }
                      style={{
                        background: 'var(--bg3)',
                        color: ESTADO_COLOR[f.estado],
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e.value} value={e.value} style={{ color: 'var(--tx1)' }}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
