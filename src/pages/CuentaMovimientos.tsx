import { useNavigate, useParams } from 'react-router-dom'
import { useCuentas } from '@/hooks/useFinance'
import { apiErrorMessage } from '@/lib/api'
import AccountMovimientos from '@/components/AccountMovimientos'

export default function CuentaMovimientos() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: cuentas, isLoading, isError, error } = useCuentas()

  if (isLoading) return <p style={{ color: 'var(--tx2)' }}>Cargando…</p>
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const cuenta = (cuentas ?? []).find((c) => c.id === Number(id))
  if (!cuenta) {
    return (
      <div>
        <p style={{ color: 'var(--tx2)', marginBottom: 12 }}>Cuenta no encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/cuentas')}
          style={{
            padding: '9px 14px',
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--bg2)',
            color: 'var(--tx1)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
          }}
        >
          ← Cuentas
        </button>
      </div>
    )
  }

  return <AccountMovimientos cuenta={cuenta} onBack={() => navigate('/cuentas')} />
}
