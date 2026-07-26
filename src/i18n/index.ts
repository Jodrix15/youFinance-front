import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es'
import ca from './locales/ca'
import en from './locales/en'

export const IDIOMAS_SOPORTADOS = ['es', 'ca', 'en'] as const
export type Idioma = (typeof IDIOMAS_SOPORTADOS)[number]

export const IDIOMA_LABEL: Record<Idioma, string> = {
  es: 'Español',
  ca: 'Català',
  en: 'English',
}

/** Normaliza cualquier valor de idioma a uno soportado (por defecto 'es'). */
export function normalizarIdioma(value: string | null | undefined): Idioma {
  const v = (value ?? '').slice(0, 2).toLowerCase()
  return (IDIOMAS_SOPORTADOS as readonly string[]).includes(v) ? (v as Idioma) : 'es'
}

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    ca: { translation: ca },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
