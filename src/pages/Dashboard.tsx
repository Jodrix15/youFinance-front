import { useEffect, useMemo, useRef, useState } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout'
import WidgetFrame from '@/components/widgets/WidgetFrame'
import {
  WIDGETS,
  WIDGET_MAP,
  defaultLayout,
  defaultVisible,
} from '@/components/widgets/registry'
import s from './Dashboard.module.css'

const ReactGridLayout = WidthProvider(GridLayout)

const LS_LAYOUT = 'jodrix.dashboard.layout'
const LS_VISIBLE = 'jodrix.dashboard.visible'

function loadLayout(): Layout[] {
  try {
    const raw = localStorage.getItem(LS_LAYOUT)
    if (raw) return JSON.parse(raw) as Layout[]
  } catch {
    /* ignore */
  }
  return defaultLayout()
}

function loadVisible(): string[] {
  try {
    const raw = localStorage.getItem(LS_VISIBLE)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    /* ignore */
  }
  return defaultVisible()
}

export default function Dashboard() {
  const [layout, setLayout] = useState<Layout[]>(loadLayout)
  const [visible, setVisible] = useState<string[]>(loadVisible)
  const [addOpen, setAddOpen] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    localStorage.setItem(LS_LAYOUT, JSON.stringify(layout))
  }, [layout])
  useEffect(() => {
    localStorage.setItem(LS_VISIBLE, JSON.stringify(visible))
  }, [visible])

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

  function resetLayout() {
    setLayout(defaultLayout())
    setVisible(defaultVisible())
    localStorage.removeItem(LS_LAYOUT)
    localStorage.removeItem(LS_VISIBLE)
  }

  const hidden = WIDGETS.filter((w) => !visible.includes(w.id))

  return (
    <div>
      <div className={s.header}>
        <div>
          <div className={s.title}>Dashboard</div>
          <div className={s.sub}>
            Arrastra por el icono, redimensiona desde la esquina, oculta con ×
          </div>
        </div>
        <div className={s.spacer} />
        <div className={s.actions} ref={addRef}>
          <button className={s.btn} onClick={resetLayout}>
            Restablecer
          </button>
          <button className={s.btn} onClick={() => setAddOpen((o) => !o)}>
            + Añadir widget
          </button>
          {addOpen && (
            <div className={s.addMenu}>
              <div className={s.addTitle}>Widgets disponibles</div>
              {WIDGETS.map((w) => {
                const isVisible = visible.includes(w.id)
                return (
                  <button
                    key={w.id}
                    className={s.addItem}
                    disabled={isVisible}
                    onClick={() => addWidget(w.id)}
                  >
                    {w.title}
                    <span className={s.tag}>{isVisible ? 'activo' : 'añadir'}</span>
                  </button>
                )
              })}
              {hidden.length === 0 && (
                <div className={s.addTitle} style={{ borderBottom: 'none' }}>
                  Todos los widgets están visibles.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ReactGridLayout
        className="layout"
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
              <WidgetFrame title={def.title} onHide={() => hideWidget(l.i)}>
                <Comp />
              </WidgetFrame>
            </div>
          )
        })}
      </ReactGridLayout>
    </div>
  )
}
