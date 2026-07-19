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
