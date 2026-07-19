import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { financeApi } from '@/lib/finance'
import type {
  ActualizarGasto,
  ActualizarInversionDTO,
  CrearCategoria,
  CrearGasto,
  CuentaDTO,
  DeudaDTO,
  DeudaResponse,
  GastoRecurrenteResponse,
  InversionDTO,
  InversionResponse,
  NuevoPrecioRequest,
  TipoPago,
  TransaccionDTO,
} from '@/types/api'

export function useCuentas() {
  return useQuery({ queryKey: ['cuentas'], queryFn: financeApi.cuentas })
}

export function useInversiones() {
  return useQuery({ queryKey: ['inversiones'], queryFn: financeApi.inversiones })
}

// Totales de inversión calculados en el backend (una sola llamada a /resumen).
export function useInversionTotales() {
  const q = useQuery({
    queryKey: ['inversionResumen'],
    queryFn: financeApi.inversionResumen,
  })
  return {
    importeTotal: q.data?.importeTotal ?? 0,
    aportadoTotal: q.data?.capitalAportadoTotal ?? 0,
    plusvaliaTotal: q.data?.plusvaliaTotal ?? 0,
    porcentajeTotal: q.data?.porcentajeTotal ?? 0,
    isLoading: q.isLoading,
  }
}

// Resumen de deudas (KPIs) calculado en el backend.
export function useResumenDeuda() {
  return useQuery({ queryKey: ['deudaResumen'], queryFn: financeApi.deudaResumen })
}

// Resumen de recurrentes/suscripciones (según tipoPago) calculado en el backend.
export function useResumenRecurrente(tipo: TipoPago) {
  return useQuery({
    queryKey: ['recurrenteResumen', tipo],
    queryFn: () => financeApi.recurrenteResumen(tipo),
  })
}

// Resumen de cuentas + agregados de movimientos del periodo, calculado en el backend.
export function useResumenCuenta(anio?: number, mes?: number) {
  return useQuery({
    queryKey: ['cuentaResumen', anio ?? null, mes ?? null],
    queryFn: () => financeApi.cuentaResumen({ anio, mes }),
  })
}

export function useDeudas() {
  return useQuery({ queryKey: ['deudas'], queryFn: financeApi.deudas })
}

export function useRecurrentes() {
  return useQuery({ queryKey: ['recurrentes'], queryFn: financeApi.recurrentes })
}

export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: financeApi.categorias })
}

export function useMovimientos() {
  return useQuery({ queryKey: ['movimientos'], queryFn: financeApi.movimientos })
}

export function useMovimientosPaginados(params: {
  page: number
  size: number
  sort: string
  tipo?: string
  cuentaId?: number
  anio?: number
  mes?: number
  q?: string
}) {
  return useQuery({
    queryKey: ['movimientosPaginados', params],
    queryFn: () => financeApi.movimientosPaginados(params),
    placeholderData: keepPreviousData,
  })
}

export function usePatrimonioHistorico() {
  return useQuery({
    queryKey: ['patrimonioHistorico'],
    queryFn: financeApi.patrimonioHistorico,
  })
}

export function useTransacciones(cuentaId: number) {
  return useQuery({
    queryKey: ['transacciones', cuentaId],
    queryFn: () => financeApi.transacciones(cuentaId),
    enabled: !!cuentaId,
  })
}

export function useCrearCuenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CuentaDTO) => financeApi.crearCuenta(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cuentas'] })
      qc.invalidateQueries({ queryKey: ['cuentaResumen'] })
    },
  })
}

// ── Mutaciones ──
export function useCrearTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, ...body }: { cuentaId: number } & TransaccionDTO) =>
      financeApi.crearTransaccion(cuentaId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['movimientosPaginados'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
      qc.invalidateQueries({ queryKey: ['cuentaResumen'] })
    },
  })
}

export function useEliminarTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, id }: { cuentaId: number; id: number }) =>
      financeApi.eliminarTransaccion(cuentaId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['movimientosPaginados'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
      qc.invalidateQueries({ queryKey: ['cuentaResumen'] })
    },
  })
}

export function useActualizarTransaccion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cuentaId, id, ...body }: { cuentaId: number; id: number } & TransaccionDTO) =>
      financeApi.actualizarTransaccion(cuentaId, id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['movimientosPaginados'] })
      qc.invalidateQueries({ queryKey: ['transacciones'] })
      qc.invalidateQueries({ queryKey: ['cuentas'] })
      qc.invalidateQueries({ queryKey: ['cuentaResumen'] })
    },
  })
}
export function useCrearInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: InversionDTO) => financeApi.crearInversion(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] })
      qc.invalidateQueries({ queryKey: ['inversionResumen'] })
    },
  })
}

export function useActualizarInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & ActualizarInversionDTO) =>
      financeApi.actualizarInversion(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] })
      qc.invalidateQueries({ queryKey: ['inversionResumen'] })
    },
  })
}

export function useEliminarInversion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.eliminarInversion(id),
    // Borrado optimista: quitamos la inversión de la lista al instante y la
    // restauramos si la API falla.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['inversiones'] })
      const prev = qc.getQueryData<InversionResponse[]>(['inversiones'])
      qc.setQueryData<InversionResponse[]>(['inversiones'], (old) =>
        (old ?? []).filter((i) => i.id !== id),
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['inversiones'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['inversiones'] })
      qc.invalidateQueries({ queryKey: ['inversionResumen'] })
    },
  })
}

export function useCrearCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CrearCategoria) => financeApi.crearCategoria(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export function useActualizarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & CrearCategoria) =>
      financeApi.actualizarCategoria(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      // El nombre de la categoría se muestra en movimientos e inversiones.
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['movimientosPaginados'] })
      qc.invalidateQueries({ queryKey: ['inversiones'] })
    },
  })
}

export function useEliminarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.eliminarCategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export function useCrearDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: DeudaDTO) => financeApi.crearDeuda(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deudas'] })
      qc.invalidateQueries({ queryKey: ['deudaResumen'] })
    },
  })
}

export function useActualizarDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & DeudaDTO) =>
      financeApi.actualizarDeuda(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deudas'] })
      qc.invalidateQueries({ queryKey: ['deudaResumen'] })
    },
  })
}

export function useEliminarDeuda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.eliminarDeuda(id),
    // Borrado optimista: quitamos la deuda de la lista al instante y la
    // restauramos si la API falla.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['deudas'] })
      const prev = qc.getQueryData<DeudaResponse[]>(['deudas'])
      qc.setQueryData<DeudaResponse[]>(['deudas'], (old) =>
        (old ?? []).filter((d) => d.id !== id),
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['deudas'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['deudas'] })
      qc.invalidateQueries({ queryKey: ['deudaResumen'] })
    },
  })
}

export function useCrearRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CrearGasto) => financeApi.crearRecurrente(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrentes'] })
      qc.invalidateQueries({ queryKey: ['recurrenteResumen'] })
    },
  })
}

export function useActualizarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & ActualizarGasto) =>
      financeApi.actualizarRecurrente(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrentes'] })
      qc.invalidateQueries({ queryKey: ['recurrenteResumen'] })
    },
  })
}

export function useNuevoPrecioRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & NuevoPrecioRequest) =>
      financeApi.nuevoPrecioRecurrente(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurrentes'] })
      qc.invalidateQueries({ queryKey: ['recurrenteResumen'] })
    },
  })
}

export function useEliminarRecurrente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.removeRecurrente(id),
    // Borrado optimista: quitamos el recurrente de la lista al instante y lo
    // restauramos si la API falla.
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ['recurrentes'] })
      const prev = qc.getQueryData<GastoRecurrenteResponse[]>(['recurrentes'])
      qc.setQueryData<GastoRecurrenteResponse[]>(['recurrentes'], (old) =>
        (old ?? []).filter((r) => r.id !== id),
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['recurrentes'], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['recurrentes'] })
      qc.invalidateQueries({ queryKey: ['recurrenteResumen'] })
    },
  })
}
