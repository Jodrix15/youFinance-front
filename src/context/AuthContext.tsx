import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi, userApi } from '@/lib/finance'
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
  /** Fusiona un perfil devuelto por el backend en la sesión activa. */
  applyProfile: (profile: UserProfile) => void
}

// El JWT vive en una cookie httpOnly (no accesible desde JS). En localStorage
// solo cacheamos datos NO sensibles del perfil para hidratar la UI al instante;
// la fuente de verdad de la sesión es la cookie, que se valida con /me al arrancar.
const USER_KEY = 'jodrix.user'

function loadUser(): SessionUser | null {
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
  const queryClient = useQueryClient()

  const store = useCallback((u: SessionUser) => {
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }, [])

  const clearLocal = useCallback(() => {
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  // Al arrancar, si había sesión cacheada validamos la cookie con /me.
  useEffect(() => {
    if (!localStorage.getItem(USER_KEY)) return
    userApi
      .me()
      .then((p) => store(profileToSession(p)))
      .catch(() => {
        // Cookie ausente/expirada: limpiamos la sesión local.
        clearLocal()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (body: LoginRequest) => {
      await authApi.login(body) // el backend fija la cookie httpOnly
      // Descarta datos cacheados del usuario anterior antes de montar las vistas.
      queryClient.clear()
      const p = await userApi.me()
      store(profileToSession(p))
    },
    [store, queryClient],
  )

  const register = useCallback(
    async (body: RegisterRequest) => {
      await authApi.register(body) // el backend fija la cookie httpOnly
      queryClient.clear()
      const p = await userApi.me()
      store(profileToSession(p))
    },
    [store, queryClient],
  )

  const logout = useCallback(() => {
    // Pedimos al backend que borre la cookie; pase lo que pase, limpiamos local.
    authApi.logout().catch(() => {
      /* la sesión se limpia igualmente en el cliente */
    })
    clearLocal()
    queryClient.clear()
  }, [clearLocal, queryClient])

  const applyProfile = useCallback(
    (profile: UserProfile) => {
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
