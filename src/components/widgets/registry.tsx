import type { ComponentType } from 'react'
import type { Layout } from 'react-grid-layout'
import MetricsWidget from './MetricsWidget'
import PatrimonioWidget from './PatrimonioWidget'
import DeudasWidget from './DeudasWidget'
import CuentasWidget from './CuentasWidget'
import RecurrentesWidget from './RecurrentesWidget'
import GastosFijosWidget from './GastosFijosWidget'
import PatrimonioEvolucionWidget from './PatrimonioEvolucionWidget'
import GastosCategoriaWidget from './GastosCategoriaWidget'
import TopMesesGastoWidget from './TopMesesGastoWidget'
import FlujoCajaWidget from './FlujoCajaWidget'

export interface WidgetDef {
  id: string
  title: string
  component: ComponentType
  // Layout por defecto (grid de 12 columnas)
  default: Omit<Layout, 'i'>
}

export const WIDGETS: WidgetDef[] = [
  {
    id: 'metrics',
    title: 'Resumen',
    component: MetricsWidget,
    default: { x: 0, y: 0, w: 12, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'patrimonio-evolucion',
    title: 'Evolución del patrimonio',
    component: PatrimonioEvolucionWidget,
    default: { x: 0, y: 4, w: 9, h: 8, minW: 4, minH: 6 },
  },
  {
    id: 'patrimonio',
    title: 'Distribución del patrimonio',
    component: PatrimonioWidget,
    default: { x: 9, y: 4, w: 3, h: 8, minW: 3, minH: 6 },
  },
  {
    id: 'flujo-caja',
    title: 'Flujo de caja',
    component: FlujoCajaWidget,
    default: { x: 0, y: 12, w: 9, h: 8, minW: 4, minH: 6 },
  },
  {
    id: 'gastos-fijos',
    title: 'Gastos fijos mensuales',
    component: GastosFijosWidget,
    default: { x: 9, y: 12, w: 3, h: 8, minW: 3, minH: 5 },
  },
  {
    id: 'gastos-categoria',
    title: 'Gastos por categoría',
    component: GastosCategoriaWidget,
    default: { x: 0, y: 20, w: 3, h: 6, minW: 3, minH: 6 },
  },
  {
    id: 'recurrentes',
    title: 'Gastos recurrentes',
    component: RecurrentesWidget,
    default: { x: 3, y: 20, w: 6, h: 6, minW: 3, minH: 5 },
  },
  {
    id: 'deudas',
    title: 'Deudas activas',
    component: DeudasWidget,
    default: { x: 9, y: 20, w: 3, h: 6, minW: 3, minH: 5 },
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    component: CuentasWidget,
    default: { x: 0, y: 26, w: 6, h: 6, minW: 3, minH: 5 },
  },
  {
    id: 'top-meses-gasto',
    title: 'Top 5 meses con más gasto',
    component: TopMesesGastoWidget,
    default: { x: 6, y: 26, w: 6, h: 8, minW: 3, minH: 5 },
  },
]

export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w]),
)

export function defaultLayout(): Layout[] {
  return WIDGETS.map((w) => ({ i: w.id, ...w.default }))
}

// Widgets visibles por defecto para un usuario nuevo (misma disposición que el
// admin). Cuentas y Top 5 meses quedan disponibles en "Añadir widget" pero
// ocultos de inicio.
const DEFAULT_VISIBLE = [
  'metrics',
  'patrimonio-evolucion',
  'patrimonio',
  'flujo-caja',
  'gastos-fijos',
  'gastos-categoria',
  'recurrentes',
  'deudas',
]

export function defaultVisible(): string[] {
  return WIDGETS.filter((w) => DEFAULT_VISIBLE.includes(w.id)).map((w) => w.id)
}
