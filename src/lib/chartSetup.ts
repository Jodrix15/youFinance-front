import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
} from 'chart.js'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Filler,
  Legend,
  Tooltip,
)

// Paleta de marca (coincide con los tokens CSS)
export const PALETTE = [
  '#2f81f7', // blue
  '#1d9e75', // teal
  '#d29922', // amber
  '#8b7ec8', // purple
  '#d85a30', // coral
  '#d4537e', // pink
  '#6e7681', // gray
]

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function chartTheme() {
  return {
    grid: cssVar('--grid-line') || 'rgba(255,255,255,0.06)',
    tick: cssVar('--tx2') || '#8b949e',
    border: cssVar('--card-bg') || '#161b22',
  }
}

// ── Seguimiento del puntero en las series temporales ──

/**
 * Línea vertical de referencia bajo el punto que el ratón tiene activo.
 * Se pasa por la prop `plugins` del gráfico (no se registra en global) para
 * que solo afecte a las series temporales, no a donuts ni barras.
 */
export const crosshairPlugin: Plugin<'line'> = {
  id: 'crosshair',
  afterDatasetsDraw(chart) {
    const activos = chart.getActiveElements()
    if (activos.length === 0) return
    const { x } = activos[0].element
    const { top, bottom } = chart.chartArea
    const ctx = chart.ctx
    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.strokeStyle = cssVar('--tx3') || '#6e7681'
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.restore()
  },
}

/**
 * El hover engancha toda la columna (no hace falta acertar el punto) y el
 * tooltip muestra el valor de cada serie en esa fecha.
 */
export const hoverIndex = { mode: 'index' as const, intersect: false }

/** Estilo del tooltip alineado con los tokens de la app. */
export function tooltipTheme() {
  return {
    backgroundColor: cssVar('--card-bg') || '#161b22',
    titleColor: cssVar('--tx1') || '#e6edf3',
    bodyColor: cssVar('--tx2') || '#8b949e',
    borderColor: cssVar('--border') || 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    displayColors: true,
    boxWidth: 8,
    boxHeight: 8,
    boxPadding: 4,
  }
}

/**
 * Puntos que solo aparecen al pasar el ratón, sobre la línea de referencia.
 * Es función (y no constante) para que el borde siga al tema activo.
 */
export function puntoHover() {
  return {
    pointHoverRadius: 5,
    pointHoverBorderColor: cssVar('--card-bg') || '#161b22',
    pointHoverBorderWidth: 2,
    // Área generosa para que el punto reaccione sin apuntar con precisión.
    pointHitRadius: 20,
  }
}
