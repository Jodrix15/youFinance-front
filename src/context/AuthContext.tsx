import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authApi, userApi } from '@/lib/finance'
import { clearToken, getToken, setToken } from '@/lib/api'
import type {
  LoginRequest,
  Moneda,
  RegisterRequest,
  Role,
  UserProfile,
} from '@/types/api'

interface SessionUser {
  username: string
  role: Role
  email: string | null
  fotoPerfil: string | null
  moneda: Moneda
  idioma: string
}

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  login: (body: LoginRequest) => Promise<void>
  register: (body: RegisterRequest) => Promise<void>
  logout: () => void
  /**
   * Fusiona un perfil devuelto por el backend en la sesión activa. Si el perfil
   * trae un token nuevo (cambio de username), lo persiste para no perder sesión.
   */
  applyProfile: (profile: UserProfile) => void
}

const USER_KEY = 'jodrix.user'

function loadUser(): SessionUser | null {
  if (!getToken()) return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as SessionUser) : null
}

function profileToSession(p: UserProfile): SessionUser {
  return {
    username: p.username,
    role: p.role,
    email: p.email,
    fotoPerfil: p.fotoPerfil,
    moneda: p.moneda,
    idioma: p.idioma,
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadUser)

  const store = useCallback((u: SessionUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }, [])

  const persist = useCallback(
    (partial: Pick<SessionUser, 'username' | 'role'>, token: string) => {
      setToken(token)
      // Los campos de perfil se hidratan enseguida desde /me.
      store({
        email: null,
        fotoPerfil: null,
        moneda: 'EUR',
        idioma: 'es',
        ...partial,
      })
    },
    [store],
  )

  // Al arrancar con sesión activa, refrescamos el perfil completo desde el backend.
  useEffect(() => {
    if (!getToken()) return
    userApi
      .me()
      .then((p) => store(profileToSession(p)))
      .catch(() => {
        /* el interceptor 401 ya gestiona la expiración de sesión */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (body: LoginRequest) => {
      const res = await authApi.login(body)
      persist({ username: res.username, role: res.role }, res.token)
      try {
        const p = await userApi.me()
        store(profileToSession(p))
      } catch {
        /* si falla, quedan los valores por defecto */
      }
    },
    [persist, store],
  )

  const register = useCallback(
    async (body: RegisterRequest) => {
      const res = await authApi.register(body)
      persist({ username: res.username, role: res.role }, res.token)
    },
    [persist],
  )

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const applyProfile = useCallback(
    (profile: UserProfile) => {
      if (profile.token) setToken(profile.token)
      store(profileToSession(profile))
    },
    [store],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      applyProfile,
    }),
    [user, login, register, logout, applyProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
