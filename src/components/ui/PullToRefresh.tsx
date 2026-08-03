import { useEffect, useRef, useState } from 'react'
import s from './PullToRefresh.module.css'

/** Arrastre necesario para disparar la recarga. */
const UMBRAL = 68
/** Tope visual: a partir de aquí el indicador ya no baja más. */
const TOPE = 100
/** El indicador avanza a la mitad que el dedo, para que el gesto tenga peso. */
const RESISTENCIA = 0.5

type Props = {
  onRefresh: () => Promise<unknown>
}

/**
 * Tirar hacia abajo para recargar, como en una app nativa.
 *
 * Solo escucha eventos táctiles, así que en escritorio no hace nada. Requiere
 * `overscroll-behavior-y: contain` en el body (está en global.css) para que el
 * navegador no dispare además su propia recarga de página.
 */
export default function PullToRefresh({ onRefresh }: Props) {
  const [distancia, setDistancia] = useState(0)
  const [refrescando, setRefrescando] = useState(false)
  const [soltado, setSoltado] = useState(false)

  // El gesto se lleva en refs: los listeners se registran una sola vez y no
  // deben depender del estado que ellos mismos van cambiando.
  const inicioY = useRef<number | null>(null)
  const inicioX = useRef(0)
  const vertical = useRef(false)
  const distanciaRef = useRef(0)
  const refrescandoRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const fijar = (d: number) => {
      distanciaRef.current = d
      setDistancia(d)
    }

    const cancelar = () => {
      inicioY.current = null
      vertical.current = false
      fijar(0)
    }

    /** El tirón solo vale desde arriba del todo y fuera de zonas con gesto propio. */
    const puedeTirar = (target: EventTarget | null) => {
      if (window.scrollY > 0) return false
      // Con un modal abierto el body está bloqueado: recargar detrás no aporta.
      if (document.body.style.overflow === 'hidden') return false
      const el = target as HTMLElement | null
      return !el?.closest?.(
        '[role="dialog"], .widget-drag-handle, .react-resizable-handle',
      )
    }

    const onStart = (e: TouchEvent) => {
      if (refrescandoRef.current || e.touches.length !== 1) return
      if (!puedeTirar(e.target)) return
      inicioY.current = e.touches[0].clientY
      inicioX.current = e.touches[0].clientX
      vertical.current = false
      setSoltado(false)
    }

    const onMove = (e: TouchEvent) => {
      if (inicioY.current === null || refrescandoRef.current) return
      const dy = e.touches[0].clientY - inicioY.current
      const dx = Math.abs(e.touches[0].clientX - inicioX.current)

      // Hacia arriba, o si ya se ha empezado a hacer scroll, es scroll normal.
      if (dy <= 0 || window.scrollY > 0) {
        cancelar()
        return
      }
      // Gesto horizontal (las tarjetas deslizables): no es nuestro.
      if (!vertical.current && dx > dy) {
        inicioY.current = null
        return
      }
      vertical.current = true
      // Frena el rebote del navegador mientras dura el tirón.
      if (e.cancelable) e.preventDefault()
      fijar(Math.min(dy * RESISTENCIA, TOPE))
    }

    const onEnd = () => {
      if (inicioY.current === null) return
      const disparar = distanciaRef.current >= UMBRAL
      inicioY.current = null
      vertical.current = false
      setSoltado(true)

      if (!disparar) {
        fijar(0)
        return
      }

      refrescandoRef.current = true
      setRefrescando(true)
      fijar(UMBRAL)
      // Un mínimo en pantalla: sin él, con la caché caliente el spinner
      // aparece y desaparece en el mismo fotograma y parece que no ha hecho nada.
      Promise.allSettled([
        onRefreshRef.current(),
        new Promise((r) => setTimeout(r, 600)),
      ]).finally(() => {
        refrescandoRef.current = false
        setRefrescando(false)
        fijar(0)
      })
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', cancelar)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', cancelar)
    }
  }, [])

  if (distancia === 0 && !refrescando) return null

  const progreso = Math.min(distancia / UMBRAL, 1)
  const listo = progreso >= 1

  return (
    <div
      className={`${s.wrap} ${soltado ? s.suelto : ''} ${listo || refrescando ? s.listo : ''}`}
      style={{
        transform: `translate3d(0, ${distancia}px, 0)`,
        opacity: refrescando ? 1 : progreso,
      }}
      aria-hidden="true"
    >
      {refrescando ? (
        <div className={s.spinner} />
      ) : (
        <svg
          className={s.arrow}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          // Al llegar al umbral la flecha se da la vuelta: ya se puede soltar.
          style={{ transform: `rotate(${listo ? 180 : 0}deg)` }}
        >
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </svg>
      )}
    </div>
  )
}
