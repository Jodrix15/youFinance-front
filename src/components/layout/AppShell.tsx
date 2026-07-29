import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
  const { pathname } = useLocation()

  // Título + subtítulo de cada sección para el encabezado global. Las rutas no
  // listadas (p. ej. el detalle de una cuenta) conservan su propia cabecera.
  const pageMeta: Record<string, { title: string; subtitle: string }> = {
    '/cuentas': {
      title: t('nav.cuentas'),
      subtitle: 'Tus cuentas y su saldo. Haz clic en una para ver sus movimientos.',
    },
    '/ingresos': {
      title: t('nav.ingresos'),
      subtitle: 'De dónde proviene tu dinero, clasificado por esfuerzo',
    },
    '/recurrentes': {
      title: t('nav.recurrentes'),
      subtitle: 'Tus gastos fijos mensuales y anuales',
    },
    '/suscripciones': {
      title: t('nav.suscripciones'),
      subtitle: 'Controla tus suscripciones activas y cuánto te cuestan al mes',
    },
    '/deudas': {
      title: t('nav.deudas'),
      subtitle: 'Controla lo que debes, a quién y cuánto te queda por pagar',
    },
    '/inversiones': {
      title: t('nav.inversiones'),
      subtitle: 'Controla en qué categorías estás invirtiendo y su rentabilidad',
    },
    '/presupuestos': {
      title: t('nav.presupuestos'),
      subtitle: 'Reparte tu dinero por partidas y compáralo con el gasto real',
    },
    '/ajustes': {
      title: t('menu.settings'),
      subtitle: 'Gestiona tu perfil y la configuración de la cuenta',
    },
  }
  const meta = pageMeta[pathname]

  // Evalúa logros al entrar y avisa con un toast de los recién desbloqueados.
  const { data: logros } = useLogros()
  useEffect(() => {
    const nuevos = (logros ?? []).filter((l) => l.nuevo)
    nuevos.forEach((l) =>
      notifyOk(
        t('logros.unlockedToast', {
          icon: l.icono,
          name: t(`logros.items.${l.codigo}.nombre`, l.nombre),
        }),
      ),
    )
    // Al desbloquear un logro cambia la XP; refresca el rango de la barra lateral.
    if (nuevos.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['rango'] })
    }
  }, [logros, t, queryClient])

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
      { queryKey: ['rango'], queryFn: financeApi.rango },
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
        {meta && (
          <header className={s.pageHeader}>
            <h1 className={s.pageTitle}>{meta.title}</h1>
            <p className={s.pageSubtitle}>{meta.subtitle}</p>
          </header>
        )}
        <div className={s.mainInner}>
          <ErrorBoundary>
            <Suspense fallback={<div style={{ padding: 24, color: 'var(--tx2)' }}>Cargando…</div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
