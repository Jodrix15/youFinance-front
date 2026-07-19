import { Toaster } from 'react-hot-toast'

/**
 * Toaster tematizado: usa las variables de diseño (tokens) para que los
 * toasts se adapten solos a modo claro/oscuro, igual que el resto de la app.
 */
export default function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      gutter={10}
      toastOptions={{
        duration: 4500,
        style: {
          background: 'var(--card-bg)',
          color: 'var(--tx1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          boxShadow: '0 8px 32px var(--shadow)',
          fontSize: '13px',
          fontWeight: 500,
          padding: '12px 18px',
          maxWidth: '460px',
          minWidth: '300px',
        },
        success: {
          iconTheme: { primary: 'var(--up)', secondary: 'var(--card-bg)' },
        },
        error: {
          duration: 5000,
          iconTheme: { primary: 'var(--down)', secondary: 'var(--card-bg)' },
        },
      }}
    />
  )
}
