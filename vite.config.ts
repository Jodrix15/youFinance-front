import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// El backend Spring corre en http://localhost:8080 y NO tiene CORS configurado.
// Para evitar problemas de CORS en desarrollo, proxeamos /api hacia el backend.
export default defineConfig({
  plugins: [react()],
  // react-grid-layout / react-draggable acceden a `process.env.*` en el navegador.
  // Vite no define `process`, así que lo mapeamos a un objeto vacío para evitar
  // "ReferenceError: process is not defined" al iniciar drag/resize.
  define: {
    'process.env': {},
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
