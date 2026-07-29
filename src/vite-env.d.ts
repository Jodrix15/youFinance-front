/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_API_TARGET?: string
  /** 'true' muestra el acceso rápido de demostración en el login. Solo UAT. */
  readonly VITE_DEMO_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
