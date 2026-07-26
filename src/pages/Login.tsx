import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import { apiErrorMessage } from '@/lib/api'
import { LogoIcon } from '@/components/ui/LogoIcon'
import s from './Login.module.css'

type Tab = 'signin' | 'signup'

export default function Login() {
  const { login, register } = useAuth()
  const { t } = useTranslation()
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
            You<span>Finance</span>
          </div>
        </div>

        <div className={s.title}>
          {tab === 'signin' ? t('login.welcome') : t('login.createAccount')}
        </div>
        <div className={s.sub}>
          {tab === 'signin' ? t('login.accessSub') : t('login.createSub')}
        </div>

        <div className={s.tabs}>
          <button
            type="button"
            className={`${s.tab} ${tab === 'signin' ? s.tabActive : ''}`}
            onClick={() => setTab('signin')}
          >
            {t('login.signin')}
          </button>
          <button
            type="button"
            className={`${s.tab} ${tab === 'signup' ? s.tabActive : ''}`}
            onClick={() => setTab('signup')}
          >
            {t('login.signup')}
          </button>
        </div>

        <form onSubmit={submit}>
          <div className={s.field}>
            <label>{t('login.user')}</label>
            <input
              type="text"
              autoComplete="username"
              placeholder={t('login.userPlaceholder')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className={s.field}>
            <label>{t('login.password')}</label>
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
            {loading ? t('common.loading') : tab === 'signin' ? t('login.enter') : t('login.createAccount')}
          </button>
        </form>

        <div className={s.divider}>o</div>
        <button type="button" className={s.demo} onClick={demo} disabled={loading}>
          {t('login.demo')}
        </button>

        {error && <div className={s.error}>{error}</div>}

        <div className={s.footer}>{t('login.footer')}</div>
      </div>
    </div>
  )
}
