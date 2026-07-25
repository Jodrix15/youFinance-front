import { useState, type FormEvent } from 'react'
import { useEnviarFeedback } from '@/hooks/useFinance'
import { apiErrorMessage } from '@/lib/api'
import type { FeedbackCategoria } from '@/types/api'

const CATEGORIAS: { value: FeedbackCategoria; label: string }[] = [
  { value: 'INCIDENCIA', label: 'Error' },
  { value: 'MEJORA', label: 'Mejora' },
  { value: 'PREGUNTA', label: 'Duda' },
  { value: 'OTRO', label: 'Otro' },
]

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  const enviar = useEnviarFeedback()
  const [categoria, setCategoria] = useState<FeedbackCategoria>('INCIDENCIA')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!mensaje.trim()) {
      setError('Escribe un mensaje.')
      return
    }
    try {
      await enviar.mutateAsync({ categoria, mensaje: mensaje.trim() })
      setEnviado(true)
    } catch (err) {
      setError(apiErrorMessage(err))
    }
  }

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  }
  const card: React.CSSProperties = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    width: '100%',
    maxWidth: 440,
    padding: 20,
    boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
  }
  const label: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    color: 'var(--tx2)',
    marginBottom: 6,
  }
  const control: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg3)',
    color: 'var(--tx1)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'inherit',
  }

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx1)' }}>Enviar feedback</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', color: 'var(--tx2)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {enviado ? (
          <div>
            <p style={{ fontSize: 14, color: 'var(--tx1)', margin: '4px 0 16px' }}>
              ¡Gracias! Hemos recibido tu feedback. 🙌
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ ...control, width: 'auto', cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600 }}>
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={label} htmlFor="fb-cat">Categoría</label>
              <select
                id="fb-cat"
                style={control}
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as FeedbackCategoria)}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 6 }}>
              <label style={label} htmlFor="fb-msg">Mensaje</label>
              <textarea
                id="fb-msg"
                style={{ ...control, minHeight: 110, resize: 'vertical' }}
                value={mensaje}
                maxLength={2000}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Cuéntanos qué ha pasado o qué te gustaría mejorar…"
              />
              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--tx3)' }}>{mensaje.length}/2000</div>
            </div>

            {error && (
              <div style={{ color: 'var(--down)', fontSize: 12, marginBottom: 10 }}>{error}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{ ...control, width: 'auto', cursor: 'pointer', color: 'var(--tx2)' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviar.isPending}
                style={{ ...control, width: 'auto', cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff', fontWeight: 600, opacity: enviar.isPending ? 0.7 : 1 }}
              >
                {enviar.isPending ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
