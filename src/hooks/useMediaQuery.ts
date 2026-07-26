import { useEffect, useState } from 'react'

/** Punto de corte de la versión móvil (coincide con las media queries del CSS). */
export const MOBILE_BREAKPOINT = 768

/**
 * Devuelve true si la media query dada coincide, reaccionando a cambios de
 * tamaño/orientación. Basado en `window.matchMedia` (no en el user-agent).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** true cuando el ancho de pantalla es de móvil/tablet vertical (≤ 768px). */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`)
}
