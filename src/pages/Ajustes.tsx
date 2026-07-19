import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { userApi } from '@/lib/finance'
import { useAuth } from '@/context/AuthContext'
import { apiErrorMessage } from '@/lib/api'
import { notifyOk, notifyError } from '@/lib/notify'
import Skeleton from '@/components/ui/Skeleton'
import Select from '@/components/ui/Select'
import CategoriasManager from '@/components/ajustes/CategoriasManager'
import type { Moneda } from '@/types/api'
import s from './Ajustes.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Seccion = 'datos' | 'seguridad' | 'cuenta' | 'categorias'

const ICONS: Record<Seccion, JSX.Element> = {
  datos: (
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4m-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10s-3.516.68-4.168 1.332c-.678.678-.83 1.418-.832 1.664z" />
  ),
  seguridad: (
    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2" />
  ),
  cuenta: (
    <path d="M11.5 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M9.05 3a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0V3zM4.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M2.05 8a2.5 2.5 0 0 1 4.9 0H16v1H6.95a2.5 2.5 0 0 1-4.9 0H0V8zm9.45 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-2.45 1a2.5 2.5 0 0 1 4.9 0H16v1h-2.05a2.5 2.5 0 0 1-4.9 0H0v-1z" />
  ),
  categorias: (
    <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
  ),
}

const NAV: { id: Seccion; label: string }[] = [
  { id: 'datos', label: 'Datos personales' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'cuenta', label: 'Configuración de la cuenta' },
  { id: 'categorias', label: 'Gestión de categorías' },
]

const MONEDAS: { value: Moneda; label: string }[] = [
  { value: 'EUR', label: '€ Euro (EUR)' },
  { value: 'USD', label: '$ Dólar (USD)' },
  { value: 'GBP', label: '£ Libra (GBP)' },
]

const IDIOMAS: { value: string; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

const MAX_FOTO_BYTES = 2 * 1024 * 1024 // 2 MB

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

export default function Ajustes() {
  const { applyProfile } = useAuth()

  const [seccion, setSeccion] = useState<Seccion>('datos')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Perfil
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileErrors, setProfileErrors] = useState<{
    username?: string
    email?: string
  }>({})
  const fileRef = useRef<HTMLInputElement>(null)

  // Contraseña
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  // Cuenta
  const [moneda, setMoneda] = useState<Moneda>('EUR')
  const [idioma, setIdioma] = useState('es')
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    let active = true
    userApi
      .me()
      .then((p) => {
        if (!active) return
        setUsername(p.username)
        setEmail(p.email ?? '')
        setFotoPerfil(p.fotoPerfil)
        setMoneda(p.moneda)
        setIdioma(p.idioma)
      })
      .catch((err) => active && setLoadError(apiErrorMessage(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const initials = useMemo(
    () => (username || 'JF').slice(0, 2).toUpperCase(),
    [username],
  )

  async function onPickFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite re-seleccionar el mismo archivo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      notifyError('El archivo debe ser una imagen')
      return
    }
    if (file.size > MAX_FOTO_BYTES) {
      notifyError('La imagen no puede superar 2 MB')
      return
    }
    try {
      setFotoPerfil(await fileToDataUrl(file))
    } catch (err) {
      notifyError(err)
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    const u = username.trim()
    const em = email.trim()
    const errs: typeof profileErrors = {}
    if (u.length < 3) errs.username = 'Debe tener al menos 3 caracteres'
    else if (u.length > 30) errs.username = 'Máximo 30 caracteres'
    if (em && !EMAIL_RE.test(em)) errs.email = 'El email no es válido'
    setProfileErrors(errs)
    if (Object.keys(errs).length) return

    setSavingProfile(true)
    try {
      const profile = await userApi.updateProfile({
        username: u,
        email: em || null,
        fotoPerfil,
      })
      applyProfile(profile)
      notifyOk('Perfil actualizado')
    } catch (err) {
      const msg = apiErrorMessage(err)
      if (/usuario/i.test(msg)) setProfileErrors({ username: msg })
      else if (/email/i.test(msg)) setProfileErrors({ email: msg })
      else notifyError(err)
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault()
    const errs: typeof passwordErrors = {}
    if (!currentPassword) errs.currentPassword = 'Introduce tu contraseña actual'
    if (newPassword.length < 6) errs.newPassword = 'Mínimo 6 caracteres'
    if (confirmPassword !== newPassword)
      errs.confirmPassword = 'No coincide con la nueva contraseña'
    setPasswordErrors(errs)
    if (Object.keys(errs).length) return

    setSavingPassword(true)
    try {
      await userApi.changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      notifyOk('Contraseña actualizada')
    } catch (err) {
      const msg = apiErrorMessage(err)
      if (/actual/i.test(msg)) setPasswordErrors({ currentPassword: msg })
      else if (/nueva|distinta/i.test(msg)) setPasswordErrors({ newPassword: msg })
      else notifyError(err)
    } finally {
      setSavingPassword(false)
    }
  }

  async function savePrefs(e: FormEvent) {
    e.preventDefault()
    setSavingPrefs(true)
    try {
      const profile = await userApi.updatePreferences({ moneda, idioma })
      applyProfile(profile)
      notifyOk('Preferencias guardadas')
    } catch (err) {
      notifyError(err)
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div>
      <div className={s.header}>
        <h1>Ajustes</h1>
        <p>Gestiona tu perfil y la configuración de la cuenta</p>
      </div>

      <div className={s.layout}>
        <nav className={s.sidebar}>
          {NAV.map((item) => (
            <button
              key={item.id}
              className={`${s.navItem} ${seccion === item.id ? s.navActive : ''}`}
              onClick={() => setSeccion(item.id)}
            >
              <svg className={s.navIcon} viewBox="0 0 16 16" aria-hidden="true">
                {ICONS[item.id]}
              </svg>
              {item.label}
            </button>
          ))}
        </nav>

        <div className={s.panel}>
          {seccion === 'categorias' ? (
            <CategoriasManager />
          ) : loading ? (
            <div className={s.card}>
              <Skeleton width={180} height={20} />
              <Skeleton width="100%" height={200} style={{ marginTop: 16, borderRadius: 12 }} />
            </div>
          ) : loadError ? (
            <div className={s.card}>
              <div className={s.error}>{loadError}</div>
            </div>
          ) : seccion === 'datos' ? (
            <section className={s.card}>
              <h2 className={s.cardTitle}>Datos personales</h2>
              <form onSubmit={saveProfile} noValidate>
                <div className={s.avatarRow}>
                  <div className={s.avatarPreview}>
                    {fotoPerfil ? (
                      <img src={fotoPerfil} alt="Foto de perfil" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className={s.avatarActions}>
                    <button
                      type="button"
                      className={s.btnGhost}
                      onClick={() => fileRef.current?.click()}
                    >
                      Cambiar foto
                    </button>
                    {fotoPerfil && (
                      <button
                        type="button"
                        className={`${s.btnGhost} ${s.btnDanger}`}
                        onClick={() => setFotoPerfil(null)}
                      >
                        Quitar
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={onPickFoto}
                    />
                    <div className={s.hint}>PNG o JPG, máximo 2 MB</div>
                  </div>
                </div>

                <div className={s.grid2}>
                  <div className={s.field}>
                    <label>Nombre de usuario</label>
                    <input
                      type="text"
                      value={username}
                      aria-invalid={!!profileErrors.username}
                      maxLength={30}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        if (profileErrors.username)
                          setProfileErrors((p) => ({ ...p, username: undefined }))
                      }}
                    />
                    {profileErrors.username && (
                      <div className={s.fieldError}>{profileErrors.username}</div>
                    )}
                  </div>
                  <div className={s.field}>
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      aria-invalid={!!profileErrors.email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        if (profileErrors.email)
                          setProfileErrors((p) => ({ ...p, email: undefined }))
                      }}
                    />
                    {profileErrors.email && (
                      <div className={s.fieldError}>{profileErrors.email}</div>
                    )}
                  </div>
                </div>

                <div className={s.actions}>
                  <button className={s.btn} type="submit" disabled={savingProfile}>
                    {savingProfile ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </section>
          ) : seccion === 'seguridad' ? (
            <section className={s.card}>
              <h2 className={s.cardTitle}>Seguridad</h2>
              <form onSubmit={savePassword} noValidate>
                <div className={s.field}>
                  <label>Contraseña actual</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    aria-invalid={!!passwordErrors.currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      if (passwordErrors.currentPassword)
                        setPasswordErrors((p) => ({ ...p, currentPassword: undefined }))
                    }}
                  />
                  {passwordErrors.currentPassword && (
                    <div className={s.fieldError}>{passwordErrors.currentPassword}</div>
                  )}
                </div>
                <div className={s.grid2}>
                  <div className={s.field}>
                    <label>Nueva contraseña</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      aria-invalid={!!passwordErrors.newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (passwordErrors.newPassword)
                          setPasswordErrors((p) => ({ ...p, newPassword: undefined }))
                      }}
                    />
                    {passwordErrors.newPassword && (
                      <div className={s.fieldError}>{passwordErrors.newPassword}</div>
                    )}
                  </div>
                  <div className={s.field}>
                    <label>Repetir nueva contraseña</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      aria-invalid={!!passwordErrors.confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (passwordErrors.confirmPassword)
                          setPasswordErrors((p) => ({ ...p, confirmPassword: undefined }))
                      }}
                    />
                    {passwordErrors.confirmPassword && (
                      <div className={s.fieldError}>{passwordErrors.confirmPassword}</div>
                    )}
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} type="submit" disabled={savingPassword}>
                    {savingPassword ? 'Guardando…' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className={s.card}>
              <h2 className={s.cardTitle}>Configuración de la cuenta</h2>
              <form onSubmit={savePrefs}>
                <div className={s.grid2}>
                  <div className={s.field}>
                    <label>Moneda</label>
                    <Select
                      value={moneda}
                      options={MONEDAS}
                      onChange={setMoneda}
                      ariaLabel="Moneda"
                    />
                  </div>
                  <div className={s.field}>
                    <label>
                      Idioma <span className={s.badge}>próximamente</span>
                    </label>
                    <Select
                      value={idioma}
                      options={IDIOMAS}
                      onChange={setIdioma}
                      ariaLabel="Idioma"
                    />
                  </div>
                </div>
                <div className={s.actions}>
                  <button className={s.btn} type="submit" disabled={savingPrefs}>
                    {savingPrefs ? 'Guardando…' : 'Guardar preferencias'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
