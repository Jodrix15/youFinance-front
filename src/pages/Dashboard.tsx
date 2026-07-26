import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import { useQueryClient } from '@tanstack/react-query'
import WidgetFrame from '@/components/widgets/WidgetFrame'
import {
  WIDGETS,
  WIDGET_MAP,
  defaultLayout,
  defaultVisible,
} from '@/components/widgets/registry'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/context/AuthContext'
import {
  useDashboardConfig,
  useGuardarDashboardConfig,
} from '@/hooks/useFinance'
import { useIsMobile } from '@/hooks/useMediaQuery'
import s from './Dashboard.module.css'

// La config vive en el backend por usuario. localStorage se usa solo como caché
// para pintar al instante mientras llega la respuesta del servidor; se namespacea
// por username para no mostrar la config de otro usuario en un navegador compartido.
const cacheKeys = (username: string) => ({
  layout: `jodrix.dashboard.layout.${username}`,
  visible: `jodrix.dashboard.visible.${username}`,
})

function loadLayout(username: string): Layout[] {
  try {
    const raw = localStorage.getItem(cacheKeys(username).layout)
    if (raw) return JSON.parse(raw) as Layout[]
  } catch {
    /* ignore */
  }
  return defaultLayout()
}

function loadVisible(username: string): string[] {
  try {
    const raw = localStorage.getItem(cacheKeys(username).visible)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return defaultVisible()
}

export default function Dashboard() {
  const { user } = useAuth()
  // Puede ser undefined en el primer render, antes de que AuthContext hidrate
  // el perfil. NO usamos un placeholder ('anon'): guardar con un usuario a medio
  // resolver es justo lo que pisaba la config real al reentrar.
  const username = user?.username

  const [layout, setLayout] = useState<Layout[]>(() =>
    username ? loadLayout(username) : defaultLayout(),
  )
  const [visible, setVisible] = useState<string[]>(() =>
    username ? loadVisible(username) : defaultVisible(),
  )
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  const configQuery = useDashboardConfig(username)
  const guardar = useGuardarDashboardConfig()
  const queryClient = useQueryClient()

  // Medimos el ancho del contenedor antes de pintar (useLayoutEffect) y solo
  // entonces montamos la rejilla con ese ancho. Así evitamos el reflow de
  // WidthProvider (que monta con 1280 por defecto y recoloca al medir), que era
  // lo que hacía "saltar" la gráfica al volver a la sección.
  const gridRef = useRef<HTMLDivElement>(null)
  const [gridWidth, setGridWidth] = useState(0)
  useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const measure = () => setGridWidth(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Usuario para el que la config ya está hidratada (cache local + respuesta del
  // backend). Mientras no coincida con `username`, no se guarda nada.
  const hydratedUserRef = useRef<string | null>(null)
  // Serialización de la última config conocida como "ya guardada" (la que vino
  // del servidor/caché). Solo persistimos si el estado difiere de esto.
  const lastSavedRef = useRef<string>('')

  // Hidratación: al cambiar de usuario o al resolver su consulta, cargamos la
  // config de ESE usuario (primero caché para pintar ya, luego backend).
  useEffect(() => {
    if (!username) return

    // Cambio de usuario (o primer montaje): pinta desde la caché al instante y
    // bloquea el guardado hasta terminar de hidratar a este usuario.
    if (hydratedUserRef.current !== username) {
      hydratedUserRef.current = null
      const cachedL = loadLayout(username)
      const cachedV = loadVisible(username)
      setLayout(cachedL)
      setVisible(cachedV)
      lastSavedRef.current = JSON.stringify({ layout: cachedL, visible: cachedV })
    }

    if (configQuery.isLoading) return

    const cfg = configQuery.data
    if (cfg && Array.isArray(cfg.layout) && Array.isArray(cfg.visible)) {
      setLayout(cfg.layout as Layout[])
      setVisible(cfg.visible)
      lastSavedRef.current = JSON.stringify({
        layout: cfg.layout,
        visible: cfg.visible,
      })
    }
    // Ya hidratado para este usuario: a partir de aquí se puede guardar.
    hydratedUserRef.current = username
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, configQuery.isLoading, configQuery.data])

  // Guardado con debounce. Solo si (a) ya hidratamos a este usuario y (b) la
  // config difiere de la última conocida: así nunca se persisten los defaults ni
  // la config de otro usuario durante una transición de sesión.
  useEffect(() => {
    if (!username || hydratedUserRef.current !== username) return

    const serialized = JSON.stringify({ layout, visible })
    if (serialized === lastSavedRef.current) return

    const keys = cacheKeys(username)
    const t = setTimeout(() => {
      localStorage.setItem(keys.layout, JSON.stringify(layout))
      localStorage.setItem(keys.visible, JSON.stringify(visible))
      lastSavedRef.current = serialized
      // Sincroniza la caché de React Query para que, al volver a la sección
      // dentro del staleTime, la query devuelva la config nueva (no la antigua).
      queryClient.setQueryData(['dashboardConfig', username], { layout, visible })
      guardar.mutate({ layout, visible })
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, visible, username])

  // Guardado inmediato al salir de la sección. Si mueves un widget y navegas
  // antes de que salte el debounce (800 ms), al desmontarse se cancelaba el
  // temporizador y el cambio se perdía. Este "flush" persiste lo pendiente.
  const flushRef = useRef<() => void>(() => {})
  flushRef.current = () => {
    if (!username || hydratedUserRef.current !== username) return
    const serialized = JSON.stringify({ layout, visible })
    if (serialized === lastSavedRef.current) return
    const keys = cacheKeys(username)
    localStorage.setItem(keys.layout, JSON.stringify(layout))
    localStorage.setItem(keys.visible, JSON.stringify(visible))
    lastSavedRef.current = serialized
    queryClient.setQueryData(['dashboardConfig', username], { layout, visible })
    guardar.mutate({ layout, visible })
  }
  useEffect(() => () => flushRef.current(), [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setAddOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const visibleLayout = useMemo(
    () => layout.filter((l) => visible.includes(l.i)),
    [layout, visible],
  )

  function hideWidget(id: string) {
    setVisible((v) => v.filter((x) => x !== id))
  }

  function addWidget(id: string) {
    setVisible((v) => (v.includes(id) ? v : [...v, id]))
    // Si no existe en el layout guardado, coloca el widget en la parte inferior.
    setLayout((prev) => {
      if (prev.some((l) => l.i === id)) return prev
      const def = WIDGET_MAP[id].default
      const maxY = prev.reduce((m, l) => Math.max(m, l.y + l.h), 0)
      return [...prev, { i: id, ...def, y: maxY }]
    })
    setAddOpen(false)
  }

  const hidden = WIDGETS.filter((w) => !visible.includes(w.id))

  // En móvil los widgets se apilan en una columna (sin drag/resize), en el
  // orden visual del layout guardado.
  const isMobile = useIsMobile()
  const { t } = useTranslation()
  const mobileWidgets = useMemo(
    () => [...visibleLayout].sort((a, b) => a.y - b.y || a.x - b.x),
    [visibleLayout],
  )

  return (
    <div>
      <div className={s.header}>
        <div>
          <div className={s.title}>{t('dashboard.title')}</div>
          <div className={s.sub}>{t('dashboard.subtitle')}</div>
        </div>
        <div className={s.spacer} />
        <div className={s.actions} ref={addRef}>
          <button className={s.btn} onClick={() => setAddOpen((o) => !o)}>
            {t('dashboard.addWidget')}
          </button>
          {addOpen && (
            <div className={s.addMenu}>
              <div className={s.addTitle}>{t('dashboard.availableWidgets')}</div>
              {WIDGETS.map((w) => {
                const isVisible = visible.includes(w.id)
                return (
                  <button
                    key={w.id}
                    className={s.addItem}
                    disabled={isVisible}
                    onClick={() => addWidget(w.id)}
                  >
                    {t(`widgets.${w.id}`)}
                    <span className={s.tag}>{isVisible ? t('dashboard.active') : t('dashboard.add')}</span>
                  </button>
                )
              })}
              {hidden.length === 0 && (
                <div className={s.addTitle} style={{ borderBottom: 'none' }}>
                  {t('dashboard.allVisible')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mobileWidgets.map((l) => {
            const def = WIDGET_MAP[l.i]
            if (!def) return null
            const Comp = def.component
            return (
              <div key={l.i} style={{ height: l.h * 30 }}>
                <WidgetFrame title={t(`widgets.${l.i}`)} onHide={() => hideWidget(l.i)}>
                  <Comp />
                </WidgetFrame>
              </div>
            )
          })}
        </div>
      ) : (
      <div ref={gridRef}>
        {gridWidth > 0 && (
          <GridLayout
            className="layout"
            width={gridWidth}
            layout={visibleLayout}
            cols={12}
            rowHeight={30}
            margin={[14, 14]}
            containerPadding={[0, 0]}
            isDraggable
            isResizable
            resizeHandles={['se']}
            draggableHandle=".widget-drag-handle"
            draggableCancel=".widget-no-drag"
            onLayoutChange={(next) => {
              // Salvaguarda: si llega un layout vacío pero hay widgets visibles
              // (p.ej. un render transitorio sin hijos), lo ignoramos para no borrar
              // la configuración del usuario.
              if (next.length === 0 && visible.length > 0) return
              // Fusiona el layout de los visibles con las posiciones guardadas de los ocultos.
              setLayout((prev) => {
                const hiddenLayouts = prev.filter((l) => !visible.includes(l.i))
                return [...next, ...hiddenLayouts]
              })
            }}
          >
            {visibleLayout.map((l) => {
              const def = WIDGET_MAP[l.i]
              if (!def) return null
              const Comp = def.component
              return (
                <div key={l.i}>
                  <WidgetFrame title={t(`widgets.${l.i}`)} onHide={() => hideWidget(l.i)}>
                    <Comp />
                  </WidgetFrame>
                </div>
              )
            })}
          </GridLayout>
        )}
      </div>
      )}
    </div>
  )
}
