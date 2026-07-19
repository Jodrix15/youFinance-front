import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import AppShell from '@/components/layout/AppShell'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Inversiones from '@/pages/Inversiones'
import Deudas from '@/pages/Deudas'
import Suscripciones from '@/pages/Suscripciones'
import Recurrentes from '@/pages/Recurrentes'
import Cuentas from '@/pages/Cuentas'
import CuentaMovimientos from '@/pages/CuentaMovimientos'
import Ajustes from '@/pages/Ajustes'
import Placeholder from '@/pages/Placeholder'
import type { ReactElement } from 'react'

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { isAuthenticated } = useAuth()

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
        <Route path="/nominas" element={<Placeholder title="Nóminas" />} />
        <Route path="/recurrentes" element={<Recurrentes />} />
        <Route path="/suscripciones" element={<Suscripciones />} />
        <Route path="/deudas" element={<Deudas />} />
        <Route path="/inversiones" element={<Inversiones />} />
        <Route path="/ajustes" element={<Ajustes />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
