// Tipos espejo de los DTOs del backend Spring (com.example.finanzas.dto.*)

export type TipoMovimiento = 'GASTO' | 'INGRESO' | 'INVERSION'
export type Frecuencia = 'MENSUAL' | 'ANUAL'
export type TipoPago = 'RECURRENTE' | 'SUSCRIPCION'
export type Role = 'ROLE_ADMIN' | 'ROLE_USER'
export type Moneda = 'EUR' | 'USD' | 'GBP'

// ── Perfil / ajustes de usuario ──
export interface UserProfile {
  username: string
  email: string | null
  role: Role
  fotoPerfil: string | null
  moneda: Moneda
  idioma: string
  // Solo presente cuando la operación reemite el JWT (p.ej. al cambiar username).
  token: string | null
}

export interface UpdateProfileRequest {
  username: string
  email?: string | null
  fotoPerfil?: string | null
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface UpdatePreferencesRequest {
  moneda: Moneda
  idioma: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  role: Role
}

export interface CuentaResponse {
  id: number
  nombreCuenta: string
  importe: number
}

export interface CuentaDTO {
  nombreCuenta: string
  importe: number
}

export interface TransaccionResponse {
  id: number
  cuentaId: number | null
  tipoMovimiento: TipoMovimiento
  categoriaId: number | null
  categoriaNombre: string | null
  importe: number
  descripcion: string
  fechaTransaccion: string // ISO date (yyyy-MM-dd)
}

export interface TransaccionDTO {
  tipoMovimiento: TipoMovimiento
  categoriaId: number
  importe: number
  descripcion?: string
  fecha: string
}

export interface Movimiento extends TransaccionResponse {
  cuentaNombre: string
}

// Respuesta paginada del histórico global (incluye resumen del filtro completo)
export interface MovimientosPage {
  contenido: Movimiento[]
  pagina: number
  size: number
  totalElementos: number
  totalPaginas: number
  ingresos: number
  gastos: number
  inversiones: number
  diferencia: number
}

// ── Resúmenes (KPIs agregados calculados en el backend) ──
export interface ResumenInversion {
  importeTotal: number
  capitalAportadoTotal: number
  plusvaliaTotal: number
  porcentajeTotal: number
}

export interface ResumenDeuda {
  totalPendiente: number
  totalPagado: number
  totalConIntereses: number
  gastoMensualEstimado: number
  numeroDeudas: number
}

export interface ResumenRecurrente {
  gastoMensual: number
  gastoAnual: number
  activos: number
  total: number
}

export interface ResumenCuenta {
  totalCuentas: number
  ingresos: number
  gastos: number
  diferencia: number
  numeroCuentas: number
}

export interface InversionResponse {
  id: number
  categoriaId: number | null
  categoriaNombre: string | null
  capitalAportado: number
  capitalTotal: number
  plusvalia: number
  porcentajePlusvalia: number
}

export interface DeudaResponse {
  id: number
  nombreDeuda: string
  importe: number
  cantidadPendiente: number
  importeTotal: number
  cantidadPagada: number
  acreedor: string
  cuota: number
  frecuencia: Frecuencia
  interes: number
  fechaVencimiento: string | null
}

export interface DeudaDTO {
  nombreDeuda: string
  importe: number
  cantidadPagada?: number
  acreedor: string
  cuota: number
  frecuencia: Frecuencia
  interes?: number
  fechaVencimiento?: string | null
}

export interface RecurrentePrecioResponse {
  id: number
  fechaVariacionImporte: string
  importe: number
}

export interface GastoRecurrenteResponse {
  id: number
  nombre: string
  categoriaId: number | null
  categoriaNombre: string | null
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string | null
  fechaUltimoPago: string | null
  fechaProximoPago: string | null
  active: boolean
  importeActual: number | null
  historial: RecurrentePrecioResponse[]
}

export interface CrearGasto {
  nombre: string
  categoriaId: number
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string
  fechaUltimoPago: string
  active: boolean
  importeInicial: number
}

export interface ActualizarGasto {
  nombre: string
  categoriaId: number
  tipoPago: TipoPago
  frecuencia: Frecuencia
  fechaPrimerPago: string
  fechaUltimoPago: string
  active: boolean
}

export interface NuevoPrecioRequest {
  importe: number
  fechaVariacionImporte: string
}

export interface CategoriaResponse {
  id: number
  nombre: string
  tipo: TipoMovimiento
}

// ── Cuerpos de petición ──
export interface InversionDTO {
  categoriaId: number
  capitalAportado: number
  capitalTotal: number
}

export interface ActualizarInversionDTO {
  aportacion?: number
  valorActual?: number
}

export interface CrearCategoria {
  nombre: string
  tipo: TipoMovimiento
}

// Foto mensual del patrimonio (mes = primer día del mes, 'YYYY-MM-DD')
export interface PatrimonioSnapshot {
  mes: string
  patrimonioNeto: number
  cuentas: number
  inversiones: number
  deudas: number
}

// Reparto del patrimonio para el widget de distribución: cuentas + cada
// categoría de inversión (sin deudas). El porcentaje va sobre el total.
export interface DistribucionPatrimonioResponse {
  concepto: string
  importe: number
  porcentaje: number
}

// Ingresos y gastos de un mes (1-12) del año pedido (widget de flujo de caja).
export interface FlujoCajaMesResponse {
  mes: number
  ingresos: number
  gastos: number
}

// Total gastado por categoría (widget de gastos por categoría).
export interface GastoCategoriaResponse {
  categoria: string
  total: number
}

// Desglose del gasto fijo que vence en un mes concreto.
export interface GastosFijosMesResponse {
  suscripciones: number
  recurrentes: number
  cuotasDeuda: number
  total: number
}

// ── Logros ──
export interface LogroResponse {
  codigo: string
  nombre: string
  descripcion: string
  icono: string
  desbloqueado: boolean
  fechaDesbloqueo: string | null
  progresoActual: number | null
  progresoObjetivo: number | null
  nuevo: boolean
}

// ── Feedback ──
export type FeedbackCategoria = 'INCIDENCIA' | 'MEJORA' | 'PREGUNTA' | 'OTRO'
export type FeedbackEstado = 'PENDIENTE' | 'RESUELTA' | 'DESCARTADA'

export interface FeedbackDTO {
  categoria: FeedbackCategoria
  mensaje: string
}

export interface FeedbackResponse {
  id: number
  usuario: string | null
  categoria: FeedbackCategoria
  mensaje: string
  estado: FeedbackEstado
  fechaCreacion: string
}

// Config personal del dashboard persistida por usuario en el backend.
// `layout` son items de react-grid-layout; se tipa laxo para no acoplar el DTO.
export interface DashboardConfig {
  layout: unknown[]
  visible: string[]
}

// ── Presupuestos ──
export type PeriodoPresupuesto = 'MENSUAL' | 'SEMANAL'

export interface PartidaResponse {
  id: number
  categoriaId: number | null
  categoriaNombre: string | null
  nombre: string | null
  importe: number
}

export interface PresupuestoResponse {
  id: number
  nombre: string
  periodo: PeriodoPresupuesto
  anio: number
  mes: number
  semana: number | null
  cantidadBase: number
  descontarGastosFijos: boolean
  totalPresupuestado: number
  fechaCreacion: string
  partidas: PartidaResponse[]
}

export interface PartidaDTO {
  categoriaId?: number | null
  nombre?: string | null
  importe: number
}

export interface PresupuestoDTO {
  nombre: string
  periodo: PeriodoPresupuesto
  anio: number
  mes: number
  semana?: number | null
  cantidadBase: number
  descontarGastosFijos: boolean
  partidas: PartidaDTO[]
}
