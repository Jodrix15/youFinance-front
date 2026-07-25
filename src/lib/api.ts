import axios, { AxiosError } from 'axios'

// Autenticación por cookie httpOnly:
//  - `withCredentials` hace que el navegador envíe la cookie de sesión (el JWT,
//    que el JS NO puede leer) en cada petición.
//  - Para CSRF, axios lee la cookie XSRF-TOKEN (legible) y la reenvía en la
//    cabecera X-XSRF-TOKEN en las peticiones que mutan estado.
// En dev, baseURL vacío => usa el proxy de Vite (/api -> :8080), mismo origen.
// En prod, define VITE_API_BASE_URL (y sirve front y back en el mismo sitio, o
// usa cookies SameSite=None; Secure).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

function readCookie(name: string): string | null {
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

// CSRF: en las peticiones que mutan estado (no GET/HEAD/OPTIONS) mandamos la
// cabecera X-XSRF-TOKEN leída de la cookie XSRF-TOKEN. Lo hacemos de forma
// explícita para no depender del comportamiento automático de axios (que a veces
// no la enviaba y provocaba 403 al añadir datos).
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const token = readCookie('XSRF-TOKEN')
    if (token) config.headers.set('X-XSRF-TOKEN', token)
  }
  return config
})

// Si la sesión caduca / no autorizado, redirigimos al login.
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
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
    const data = error.response?.data as
      | { message?: string; detail?: string }
      | undefined
    // Mensajes específicos del backend (p.ej. 429 de rate limiting) tienen prioridad.
    if (data?.detail) return data.detail
    if (error.response?.status === 429) {
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Credenciales incorrectas o sin permisos.'
    }
    if (error.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. ¿Está el backend arrancado en :8080?'
    }
    return data?.message ?? error.message
  }
  return 'Ha ocurrido un error inesperado.'
}
