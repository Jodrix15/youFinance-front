import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { financeApi } from '@/lib/finance'
import { useLogros } from '@/hooks/useFinance'
import { notifyOk } from '@/lib/notify'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import Topbar from './Topbar'
import s from './AppShell.module.css'

export default function AppShell() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  // Evalúa logros al entrar y avisa con un toast de los recién desbloqueados.
  const { data: logros } = useLogros()
  useEffect(() => {
    ;(logros ?? [])
      .filter((l) => l.nuevo)
      .forEach((l) =>
        notifyOk(
          t('logros.unlockedToast', {
            icon: l.icono,
            name: t(`logros.items.${l.codigo}.nombre`, l.nombre),
          }),
        ),
      )
  }, [logros, t])

  // Precargamos los datos de las secciones al entrar en la zona autenticada.
  // Así, al navegar entre secciones, ya están en caché y se pinta el contenido
  // directamente en vez de mostrar el skeleton (el pestañeo al cambiar de sección).
  // Incluimos también los resúmenes/KPIs de cada sección, con las MISMAS claves
  // que usan las páginas, para que esos datos tampoco parpadeen al abrir.
  useEffect(() => {
    const now = new Date()
    const anio = now.getFullYear()
    const mes = now.getMonth() + 1

    const jobs: Array<{ queryKey: unknown[]; queryFn: () => Promise<unknown> }> = [
      // Listas
      { queryKey: ['cuentas'], queryFn: financeApi.cuentas },
      { queryKey: ['inversiones'], queryFn: financeApi.inversiones },
      { queryKey: ['deudas'], queryFn: financeApi.deudas },
      { queryKey: ['recurrentes'], queryFn: financeApi.recurrentes },
      { queryKey: ['categorias'], queryFn: financeApi.categorias },
      { queryKey: ['movimientos'], queryFn: financeApi.movimientos },
      { queryKey: ['patrimonioHistorico'], queryFn: financeApi.patrimonioHistorico },
      // Resúmenes / KPIs
      { queryKey: ['deudaResumen'], queryFn: financeApi.deudaResumen },
      { queryKey: ['inversionResumen'], queryFn: financeApi.inversionResumen },
      {
        queryKey: ['recurrenteResumen', 'RECURRENTE'],
        queryFn: () => financeApi.recurrenteResumen('RECURRENTE'),
      },
      {
        queryKey: ['recurrenteResumen', 'SUSCRIPCION'],
        queryFn: () => financeApi.recurrenteResumen('SUSCRIPCION'),
      },
      {
        queryKey: ['cuentaResumen', anio, mes],
        queryFn: () => financeApi.cuentaResumen({ anio, mes }),
      },
    ]

    for (const job of jobs) {
      queryClient.prefetchQuery({ ...job, staleTime: 30_000 })
    }
  }, [queryClient])

  return (
    <div className={s.shell}>
      <Topbar />
      <main className={s.main}>
        <ErrorBoundary>
          <Suspense fallback={<div style={{ padding: 24, color: 'var(--tx2)' }}>Cargando…</div>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  )
}
