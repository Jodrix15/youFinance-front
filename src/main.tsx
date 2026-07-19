import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { ConfirmProvider } from '@/components/ui/ConfirmProvider'
import AppToaster from '@/components/ui/Toaster'
import App from './App'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import '@/styles/global.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
  },
})

// Nota: NO envolvemos en <StrictMode>. react-grid-layout usa findDOMNode y
// el doble montaje de StrictMode (solo en dev) rompe el drag/resize.
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <AppToaster />
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>,
)
