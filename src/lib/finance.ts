import { api } from './api'
import type {
  ActualizarGasto,
  ActualizarInversionDTO,
  CategoriaResponse,
  CrearCategoria,
  CrearGasto,
  CuentaDTO,
  CuentaResponse,
  DistribucionPatrimonioResponse,
  FlujoCajaMesResponse,
  GastoCategoriaResponse,
  GastosFijosMesResponse,
  IngresoCategoriaResponse,
  EvolucionIngresoResponse,
  ResumenIngresosResponse,
  FeedbackDTO,
  FeedbackEstado,
  FeedbackResponse,
  LogroResponse,
  DeudaDTO,
  DeudaResponse,
  GastoRecurrenteResponse,
  InversionDTO,
  InversionResponse,
  LoginRequest,
  LoginResponse,
  Movimiento,
  MovimientosPage,
  NuevoPrecioRequest,
  PatrimonioSnapshot,
  PresupuestoDTO,
  PresupuestoResponse,
  RecurrentePrecioResponse,
  RangoResponse,
  RegisterRequest,
  ResumenCuenta,
  ResumenDeuda,
  ResumenInversion,
  ResumenRecurrente,
  TipoPago,
  TransaccionDTO,
  TransaccionResponse,
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UpdatePreferencesRequest,
  DashboardConfig,
} from '@/types/api'

// ── Auth ──
export const authApi = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>('/api/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) =>
    api.post<LoginResponse>('/api/auth/register', body).then((r) => r.data),
  // Borra la cookie de sesión en el servidor (el JS no puede borrar una httpOnly).
  logout: () => api.post<void>('/api/auth/logout').then((r) => r.data),
}

// ── Perfil / ajustes ──
export const userApi = {
  me: () => api.get<UserProfile>('/api/user/me').then((r) => r.data),
  updateProfile: (body: UpdateProfileRequest) =>
    api.put<UserProfile>('/api/user/me', body).then((r) => r.data),
  changePassword: (body: ChangePasswordRequest) =>
    api.put<void>('/api/user/me/password', body).then((r) => r.data),
  updatePreferences: (body: UpdatePreferencesRequest) =>
    api.put<UserProfile>('/api/user/me/preferences', body).then((r) => r.data),
  // Config del dashboard. El backend devuelve cuerpo vacío si el usuario no tiene
  // config guardada; lo normalizamos a null para que el front use los defaults.
  getDashboard: () =>
    api
      .get<DashboardConfig | ''>('/api/user/me/dashboard')
      .then((r) => (r.data ? (r.data as DashboardConfig) : null)),
  updateDashboard: (body: DashboardConfig) =>
    api.put<DashboardConfig>('/api/user/me/dashboard', body).then((r) => r.data),
}

// ── Recursos ──
export const financeApi = {
  cuentas: () => api.get<CuentaResponse[]>('/api/cuenta').then((r) => r.data),
  cuentaResumen: (params: { anio?: number; mes?: number }) =>
    api.get<ResumenCuenta>('/api/cuenta/resumen', { params }).then((r) => r.data),
  crearCuenta: (body: CuentaDTO) =>
    api.post<CuentaResponse>('/api/cuenta', body).then((r) => r.data),
  actualizarCuenta: (id: number, body: CuentaDTO) =>
    api.put<CuentaResponse>(`/api/cuenta/${id}`, body).then((r) => r.data),
  eliminarCuenta: (id: number) =>
    api.delete<void>(`/api/cuenta/${id}`).then((r) => r.data),
  transacciones: (cuentaId: number) =>
    api
      .get<TransaccionResponse[]>(`/api/cuenta/${cuentaId}/transacciones`)
      .then((r) => r.data),
  // Todos los movimientos en una sola consulta (para agregados/KPIs).
  movimientos: () =>
    api.get<Movimiento[]>('/api/transacciones/todas').then((r) => r.data),
  // Histórico global paginado/filtrado/ordenado (server-side).
  movimientosPaginados: (params: {
    page: number
    size: number
    sort: string
    tipo?: string
    cuentaId?: number
    anio?: number
    mes?: number
    q?: string
  }) =>
    api.get<MovimientosPage>('/api/transacciones', { params }).then((r) => r.data),
  crearTransaccion: (cuentaId: number, body: TransaccionDTO) =>
    api
      .post<TransaccionResponse>(`/api/cuenta/${cuentaId}/transacciones`, body)
      .then((r) => r.data),
  actualizarTransaccion: (cuentaId: number, id: number, body: TransaccionDTO) =>
    api
      .put<TransaccionResponse>(`/api/cuenta/${cuentaId}/transacciones/${id}`, body)
      .then((r) => r.data),
  eliminarTransaccion: (cuentaId: number, id: number) =>
    api.delete<void>(`/api/cuenta/${cuentaId}/transacciones/${id}`).then((r) => r.data),
  inversiones: () => api.get<InversionResponse[]>('/api/inversion').then((r) => r.data),
  // Totales calculados en el backend (una sola llamada; evita recalcular en el front).
  inversionResumen: () =>
    api.get<ResumenInversion>('/api/inversion/resumen').then((r) => r.data),
  crearInversion: (body: InversionDTO) =>
    api.post<InversionResponse>('/api/inversion', body).then((r) => r.data),
  actualizarInversion: (id: number, body: ActualizarInversionDTO) =>
    api.put<InversionResponse>(`/api/inversion/${id}`, body).then((r) => r.data),
  eliminarInversion: (id: number) =>
    api.delete<void>(`/api/inversion/${id}`).then((r) => r.data),
  deudas: () => api.get<DeudaResponse[]>('/api/deuda').then((r) => r.data),
  deudaResumen: () => api.get<ResumenDeuda>('/api/deuda/resumen').then((r) => r.data),
  crearDeuda: (body: DeudaDTO) =>
    api.post<DeudaResponse>('/api/deuda', body).then((r) => r.data),
  actualizarDeuda: (id: number, body: DeudaDTO) =>
    api.put<DeudaResponse>(`/api/deuda/${id}`, body).then((r) => r.data),
  eliminarDeuda: (id: number) =>
    api.delete<void>(`/api/deuda/${id}`).then((r) => r.data),
  recurrentes: () =>
    api.get<GastoRecurrenteResponse[]>('/api/recurrente').then((r) => r.data),
  recurrenteResumen: (tipo: TipoPago) =>
    api
      .get<ResumenRecurrente>('/api/recurrente/resumen', { params: { tipo } })
      .then((r) => r.data),
  crearRecurrente: (body: CrearGasto) =>
    api.post<GastoRecurrenteResponse>('/api/recurrente', body).then((r) => r.data),
  actualizarRecurrente: (id: number, body: ActualizarGasto) =>
    api.put<GastoRecurrenteResponse>(`/api/recurrente/${id}`, body).then((r) => r.data),
  nuevoPrecioRecurrente: (id: number, body: NuevoPrecioRequest) =>
    api
      .patch<RecurrentePrecioResponse>(`/api/recurrente/${id}/precio`, body)
      .then((r) => r.data),
  removeRecurrente: (id: number) =>
    api.delete<void>(`/api/recurrente/${id}`).then((r) => r.data),
  categorias: () => api.get<CategoriaResponse[]>('/api/categoria').then((r) => r.data),
  crearCategoria: (body: CrearCategoria) =>
    api.post<CategoriaResponse>('/api/categoria', body).then((r) => r.data),
  actualizarCategoria: (id: number, body: CrearCategoria) =>
    api.put<CategoriaResponse>(`/api/categoria/${id}`, body).then((r) => r.data),
  eliminarCategoria: (id: number) =>
    api.delete<void>(`/api/categoria/${id}`).then((r) => r.data),
  patrimonioHistorico: () =>
    api
      .get<PatrimonioSnapshot[]>('/api/dashboard/patrimonio/historico')
      .then((r) => r.data),
  distribucionPatrimonio: () =>
    api
      .get<DistribucionPatrimonioResponse[]>('/api/dashboard/distribucion-patrimonio')
      .then((r) => r.data),
  patrimonioNeto: () =>
    api.get<number>('/api/dashboard/patrimonio-neto').then((r) => r.data),
  capitalCuentas: () =>
    api.get<number>('/api/dashboard/capital-cuentas').then((r) => r.data),
  capitalInversion: () =>
    api.get<number>('/api/dashboard/capital-inversion').then((r) => r.data),
  capitalDeuda: () =>
    api.get<number>('/api/dashboard/capital-deuda').then((r) => r.data),
  flujoCaja: (anio: number) =>
    api
      .get<FlujoCajaMesResponse[]>('/api/dashboard/flujo-caja', { params: { anio } })
      .then((r) => r.data),
  gastosCategoria: () =>
    api
      .get<GastoCategoriaResponse[]>('/api/dashboard/gastos-categoria')
      .then((r) => r.data),
  gastosFijosMes: (anio: number, mes: number) =>
    api
      .get<GastosFijosMesResponse>('/api/dashboard/gastos-fijos', { params: { anio, mes } })
      .then((r) => r.data),
  ingresosResumen: (params?: { anio?: number; mes?: number }) =>
    api
      .get<ResumenIngresosResponse>('/api/ingresos/resumen', { params })
      .then((r) => r.data),
  ingresosPorCategoria: (params?: { anio?: number; mes?: number }) =>
    api
      .get<IngresoCategoriaResponse[]>('/api/ingresos/por-categoria', { params })
      .then((r) => r.data),
  ingresosEvolucion: () =>
    api
      .get<EvolucionIngresoResponse[]>('/api/ingresos/evolucion')
      .then((r) => r.data),
  logros: () => api.get<LogroResponse[]>('/api/logros').then((r) => r.data),
  rango: () => api.get<RangoResponse>('/api/rango').then((r) => r.data),
  enviarFeedback: (body: FeedbackDTO) =>
    api.post<FeedbackResponse>('/api/feedback', body).then((r) => r.data),
  // Gestión (admin)
  listarFeedback: () =>
    api.get<FeedbackResponse[]>('/api/feedback').then((r) => r.data),
  actualizarEstadoFeedback: (id: number, estado: FeedbackEstado) =>
    api
      .patch<FeedbackResponse>(`/api/feedback/${id}/estado`, { estado })
      .then((r) => r.data),
  presupuestos: () =>
    api.get<PresupuestoResponse[]>('/api/presupuesto').then((r) => r.data),
  crearPresupuesto: (body: PresupuestoDTO) =>
    api.post<PresupuestoResponse>('/api/presupuesto', body).then((r) => r.data),
  actualizarPresupuesto: (id: number, body: PresupuestoDTO) =>
    api.put<PresupuestoResponse>(`/api/presupuesto/${id}`, body).then((r) => r.data),
  eliminarPresupuesto: (id: number) =>
    api.delete<void>(`/api/presupuesto/${id}`).then((r) => r.data),
}
