import type { RangoResponse } from '@/types/api'

// Último rango conocido, cacheado en localStorage para pintar la barra lateral
// al instante tras un refresco (evita el pestañeo mientras llega la petición).
//
// La clave va namespaceada por usuario. Sin eso, al cambiar de cuenta en el
// mismo navegador se pintaba durante un instante el rango del usuario anterior:
// el `queryClient.clear()` del login vacía la caché de React Query, pero
// `placeholderData` lee de localStorage y se la salta. Mismo criterio que las
// claves de Dashboard.tsx.
//
// Vive en su propio módulo (y no en hooks/useFinance) para que AuthContext pueda
// usarlo sin crear un import circular.
const RANGO_CACHE_PREFIX = 'yf-rango'

export const rangoCacheKey = (username: string) => `${RANGO_CACHE_PREFIX}.${username}`

export function readRangoCache(username: string | undefined): RangoResponse | undefined {
  if (!username) return undefined
  try {
    const raw = localStorage.getItem(rangoCacheKey(username))
    return raw ? (JSON.parse(raw) as RangoResponse) : undefined
  } catch {
    return undefined
  }
}

export function writeRangoCache(username: string | undefined, data: RangoResponse) {
  if (!username) return
  try {
    localStorage.setItem(rangoCacheKey(username), JSON.stringify(data))
  } catch {
    // Sin persistencia (modo privado); no pasa nada.
  }
}

/**
 * Borra las cachés de rango que queden en localStorage, incluida la clave
 * antigua sin namespacear (`yf-rango`) que dejaron versiones anteriores. Se
 * llama al cerrar sesión para no dejar rastro en un navegador compartido.
 */
export function clearRangoCache() {
  try {
    localStorage.removeItem(RANGO_CACHE_PREFIX)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (k?.startsWith(`${RANGO_CACHE_PREFIX}.`)) localStorage.removeItem(k)
    }
  } catch {
    // Sin persistencia (modo privado); no hay nada que limpiar.
  }
}
