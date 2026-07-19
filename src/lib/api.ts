import axios, { AxiosError } from 'axios'

const TOKEN_KEY = 'jodrix.token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

// En dev, baseURL vacío => usa el proxy de Vite (/api -> :8080).
// En prod, define VITE_API_BASE_URL.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

// Añade el JWT a cada petición
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Si el token caduca / no autorizado, limpiamos sesión
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken()
      // Evita bucles si ya estamos en el login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Credenciales incorrectas o sin permisos.'
    }
    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. ¿Está el backend arrancado en :8080?'
    }
    const data = error.response?.data as
      | { message?: string; detail?: string }
      | undefined
    return data?.detail ?? data?.message ?? error.message
  }
  return 'Ha ocurrido un error inesperado.'
}
