import { useTranslation } from 'react-i18next'
import { useLogros } from '@/hooks/useFinance'
import { ProgressBar } from '@/components/ui/ProgressBar'

export default function Logros() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useLogros()

  const logros = data ?? []
  const conseguidos = logros.filter((l) => l.desbloqueado).length

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('logros.title')}</h1>
      <p style={{ color: 'var(--tx2)', marginTop: 4 }}>
        {t('logros.progress', { done: conseguidos, total: logros.length })}
      </p>

      {isLoading ? (
        <div style={{ color: 'var(--tx2)', marginTop: 16 }}>{t('common.loading')}</div>
      ) : isError ? (
        <div style={{ color: 'var(--down)', marginTop: 16 }}>{t('logros.loadError')}</div>
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
                  <div style={{ fontWeight: 600, color: 'var(--tx1)' }}>
                    {t(`logros.items.${l.codigo}.nombre`, l.nombre)}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--tx2)', flex: 1 }}>
                  {t(`logros.items.${l.codigo}.desc`, l.descripcion)}
                </div>

                {l.desbloqueado ? (
                  <div style={{ fontSize: 11, color: 'var(--up)', fontWeight: 600 }}>
                    {t('logros.unlocked')}
                    {l.fechaDesbloqueo
                      ? ` · ${new Date(l.fechaDesbloqueo).toLocaleDateString()}`
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
                  <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{t('logros.locked')}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
