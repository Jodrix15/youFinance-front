import { useRef, useState, type ReactNode } from 'react'
import s from './SwipeCards.module.css'

/** A partir de este número de tarjetas los puntos se sustituyen por "3 / 12". */
const MAX_DOTS = 8

interface Props<T> {
  items: T[]
  keyOf: (item: T, index: number) => string | number
  renderItem: (item: T, index: number) => ReactNode
  ariaLabel?: string
}

/**
 * Muestra una lista como tarjetas que se pasan deslizando en horizontal, en vez
 * de apilarlas. Pensado para móvil: usa scroll nativo con scroll-snap, así que
 * el gesto lo resuelve el navegador y funciona igual con rueda o teclado.
 */
export default function SwipeCards<T>({ items, keyOf, renderItem, ariaLabel }: Props<T>) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [activo, setActivo] = useState(0)

  // El índice activo se deduce de la posición del scroll —la tarjeta cuyo
  // centro queda más cerca del centro visible—, no de escuchar el gesto.
  function onScroll() {
    const el = viewportRef.current
    if (!el) return
    const centro = el.scrollLeft + el.clientWidth / 2
    let mejor = 0
    let mejorDist = Infinity
    Array.from(el.children).forEach((hijo, i) => {
      const e = hijo as HTMLElement
      const dist = Math.abs(e.offsetLeft + e.offsetWidth / 2 - centro)
      if (dist < mejorDist) {
        mejorDist = dist
        mejor = i
      }
    })
    setActivo(mejor)
  }

  function irA(idx: number) {
    const el = viewportRef.current
    const hijo = el?.children[idx] as HTMLElement | undefined
    if (!el || !hijo) return
    el.scrollTo({
      left: hijo.offsetLeft - (el.clientWidth - hijo.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }

  return (
    <div>
      <div
        className={s.viewport}
        ref={viewportRef}
        onScroll={onScroll}
        role="group"
        aria-label={ariaLabel}
      >
        {items.map((item, i) => (
          <div key={keyOf(item, i)} className={s.slide}>
            {renderItem(item, i)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className={s.footer}>
          {items.length <= MAX_DOTS ? (
            items.map((item, i) => (
              <button
                key={keyOf(item, i)}
                type="button"
                className={`${s.dot} ${i === activo ? s.dotActive : ''}`}
                aria-label={`Ir a la tarjeta ${i + 1} de ${items.length}`}
                aria-current={i === activo}
                onClick={() => irA(i)}
              />
            ))
          ) : (
            <span className={s.counter}>
              {activo + 1} / {items.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
