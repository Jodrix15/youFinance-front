import { useLogros } from '@/hooks/useFinance'
import { ProgressBar } from '@/components/ui/ProgressBar'

export default function Logros() {
  const { data, isLoading, isError } = useLogros()

  const logros = data ?? []
  const conseguidos = logros.filter((l) => l.desbloqueado).length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Logros</h1>
      <p style={{ color: 'var(--tx2)', marginTop: 4 }}>
        {conseguidos} de {logros.length} conseguidos.
      </p>

      {isLoading ? (
        <div style={{ color: 'var(--tx2)', marginTop: 16 }}>Cargando…</div>
      ) : isError ? (
        <div style={{ color: 'var(--down)', marginTop: 16 }}>No se pudieron cargar los logros.</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 14,
            marginTop: 16,
          }}
        >
          {logros.map((l) => {
            const tieneProgreso = l.progresoObjetivo != null && l.progresoObjetivo > 0
            const pct = tieneProgreso
              ? Math.max(0, Math.min(100, ((l.progresoActual ?? 0) / (l.progresoObjetivo as number)) * 100))
              : 0
            return (
              <div
                key={l.codigo}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  opacity: l.desbloqueado ? 1 : 0.6,
                  borderColor: l.desbloqueado ? 'var(--up)' : 'var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28, filter: l.desbloqueado ? 'none' : 'grayscale(1)' }}>
                    {l.icono}
                  </span>
                  <div style={{ fontWeight: 600, color: 'var(--tx1)' }}>{l.nombre}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', flex: 1 }}>{l.descripcion}</div>

                {l.desbloqueado ? (
                  <div style={{ fontSize: 11, color: 'var(--up)', fontWeight: 600 }}>
                    ✓ Conseguido
                    {l.fechaDesbloqueo
                      ? ` · ${new Date(l.fechaDesbloqueo).toLocaleDateString('es-ES')}`
                      : ''}
                  </div>
                ) : tieneProgreso ? (
                  <div>
                    <ProgressBar value={pct} />
                    <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 4, textAlign: 'right' }}>
                      {Math.floor(l.progresoActual ?? 0)} / {l.progresoObjetivo}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>Bloqueado</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
