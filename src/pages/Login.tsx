import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { apiErrorMessage } from '@/lib/api'
import { LogoIcon } from '@/components/ui/LogoIcon'
import s from './Login.module.css'

type Tab = 'signin' | 'signup'

export default function Login() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        await login({ username, password })
      } else {
        await register({ username, password })
      }
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function demo() {
    setError(null)
    setLoading(true)
    try {
      await login({ username: 'admin', password: 'admin123' })
      navigate('/', { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={s.screen}>
      <div className={s.card}>
        <div className={s.logo}>
          <div className={s.logoIcon}>
            <LogoIcon />  
          </div>
          <div className={s.brand}>
            <span>YouFinance</span>
          </div>
        </div>

        <div className={s.title}>
          {tab === 'signin' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
        </div>
        <div className={s.sub}>
          {tab === 'signin'
            ? 'Accede a tu panel financiero'
            : 'Empieza a controlar tus finanzas'}
        </div>

        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${tab === 'signin' ? s.tabActive : ''}`}
            onClick={() => setTab('signin')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={`${s.tab} ${tab === 'signup' ? s.tabActive : ''}`}
            onClick={() => setTab('signup')}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={submit}>
          <div className={s.field}>
            <label>Usuario</label>
            <input
              type="text"
              autoComplete="username"
              placeholder="tu usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={s.field}>
            <label>Contraseña</label>
            <input
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              placeholder={tab === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={tab === 'signup' ? 6 : undefined}
              required
            />
          </div>
          <button className={s.btn} type="submit" disabled={loading}>
            {loading ? 'Cargando…' : tab === 'signin' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <div className={s.divider}>o</div>
        <button type="button" className={s.demo} onClick={demo} disabled={loading}>
          Entrar con cuenta demo (admin)
        </button>

        {error && <div className={s.error}>{error}</div>}

        <div className={s.footer}>YouFinance · Panel financiero personal</div>
      </div>
    </div>
  )
}
