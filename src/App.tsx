import { lazy, type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { setActiveCurrency } from '@/lib/format'
import i18n, { normalizarIdioma } from '@/i18n'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'

// Páginas secundarias cargadas bajo demanda (code-splitting): reducen el bundle
// inicial; el Suspense/ErrorBoundary del AppShell cubre su carga.
const Inversiones = lazy(() => import('@/pages/Inversiones'))
const Deudas = lazy(() => import('@/pages/Deudas'))
const Suscripciones = lazy(() => import('@/pages/Suscripciones'))
const Recurrentes = lazy(() => import('@/pages/Recurrentes'))
const Cuentas = lazy(() => import('@/pages/Cuentas'))
const CuentaMovimientos = lazy(() => import('@/pages/CuentaMovimientos'))
const Ingresos = lazy(() => import('@/pages/Ingresos'))
const Presupuestos = lazy(() => import('@/pages/Presupuestos'))
const Ajustes = lazy(() => import('@/pages/Ajustes'))
const Incidencias = lazy(() => import('@/pages/Incidencias'))
const Logros = lazy(() => import('@/pages/Logros'))

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const { user } = useAuth()
  return user?.role === 'ROLE_ADMIN' ? children : <Navigate to="/" replace />
}

export default function App() {
  const { isAuthenticated, user } = useAuth()

  // Fija la moneda con la que se formatean los importes en toda la app antes de
  // renderizar las páginas hijas. Al cambiarla en Ajustes, applyProfile actualiza
  // el usuario y App vuelve a renderizar, propagando el nuevo símbolo a todas
  // las vistas montadas.
  setActiveCurrency(user?.moneda ?? 'EUR')

  // Sincroniza el idioma de la interfaz con la preferencia del usuario.
  const idioma = normalizarIdioma(user?.idioma)
  if (i18n.language !== idioma) i18n.changeLanguage(idioma)

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/cuentas" element={<Cuentas />} />
        <Route path="/cuentas/:id" element={<CuentaMovimientos />} />
        <Route path="/ingresos" element={<Ingresos />} />
        <Route path="/recurrentes" element={<Recurrentes />} />
        <Route path="/suscripciones" element={<Suscripciones />} />
        <Route path="/deudas" element={<Deudas />} />
        <Route path="/inversiones" element={<Inversiones />} />
        <Route path="/presupuestos" element={<Presupuestos />} />
        <Route path="/ajustes" element={<Ajustes />} />
        <Route path="/logros" element={<Logros />} />
        <Route
          path="/incidencias"
          element={
            <RequireAdmin>
              <Incidencias />
            </RequireAdmin>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
