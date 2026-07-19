import type { ComponentType } from 'react'
import type { Layout } from 'react-grid-layout'
import MetricsWidget from './MetricsWidget'
import PatrimonioWidget from './PatrimonioWidget'
import InversionesWidget from './InversionesWidget'
import DeudasWidget from './DeudasWidget'
import CuentasWidget from './CuentasWidget'
import RecurrentesWidget from './RecurrentesWidget'
import GastosFijosWidget from './GastosFijosWidget'
import PatrimonioEvolucionWidget from './PatrimonioEvolucionWidget'
import GastosCategoriaWidget from './GastosCategoriaWidget'

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
    id: 'patrimonio',
    title: 'Distribución del patrimonio',
    component: PatrimonioWidget,
    default: { x: 0, y: 4, w: 4, h: 9, minW: 3, minH: 6 },
  },
  {
    id: 'inversiones',
    title: 'Inversiones por categoría',
    component: InversionesWidget,
    default: { x: 4, y: 4, w: 4, h: 9, minW: 3, minH: 6 },
  },
  {
    id: 'recurrentes',
    title: 'Gastos recurrentes',
    component: RecurrentesWidget,
    default: { x: 8, y: 4, w: 4, h: 9, minW: 3, minH: 5 },
  },
  {
    id: 'deudas',
    title: 'Deudas activas',
    component: DeudasWidget,
    default: { x: 0, y: 13, w: 6, h: 8, minW: 3, minH: 5 },
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    component: CuentasWidget,
    default: { x: 6, y: 13, w: 6, h: 8, minW: 3, minH: 5 },
  },
  {
    id: 'gastos-fijos',
    title: 'Gastos fijos mensuales',
    component: GastosFijosWidget,
    default: { x: 0, y: 21, w: 6, h: 7, minW: 3, minH: 5 },
  },
  {
    id: 'patrimonio-evolucion',
    title: 'Evolución del patrimonio',
    component: PatrimonioEvolucionWidget,
    default: { x: 0, y: 28, w: 8, h: 9, minW: 4, minH: 6 },
  },
  {
    id: 'gastos-categoria',
    title: 'Gastos por categoría',
    component: GastosCategoriaWidget,
    default: { x: 8, y: 28, w: 4, h: 9, minW: 3, minH: 6 },
  },
]

export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.id, w]),
)

export function defaultLayout(): Layout[] {
  return WIDGETS.map((w) => ({ i: w.id, ...w.default }))
}

export function defaultVisible(): string[] {
  return WIDGETS.map((w) => w.id)
}
