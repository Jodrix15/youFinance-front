import toast from 'react-hot-toast'
import { apiErrorMessage } from '@/lib/api'

/** Toast de éxito con el estilo tematizado global. */
export function notifyOk(message: string) {
  return toast.success(message)
}

/** Toast de error. Acepta un mensaje o un error de API (lo formatea solo). */
export function notifyError(err: unknown, fallback = 'Ha ocurrido un error') {
  const msg = typeof err === 'string' ? err : apiErrorMessage(err) || fallback
  return toast.error(msg)
}

export { default as toast } from 'react-hot-toast'
