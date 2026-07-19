import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import Modal from './Modal'
import s from './ConfirmProvider.module.css'

type ConfirmOptions = {
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  /** 'danger' pinta el botón de confirmar en rojo (borrados). */
  variant?: 'danger' | 'default'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>')
  return ctx
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const close = useCallback((result: boolean) => {
    resolver.current?.(result)
    resolver.current = null
    setOpts(null)
  }, [])

  const danger = opts?.variant === 'danger'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={opts !== null}
        onClose={() => close(false)}
        footer={
          <>
            <button
              type="button"
              className={s.cancel}
              onClick={() => close(false)}
            >
              {opts?.cancelText ?? 'Cancelar'}
            </button>
            <button
              type="button"
              className={danger ? s.danger : s.confirm}
              onClick={() => close(true)}
            >
              {opts?.confirmText ?? 'Confirmar'}
            </button>
          </>
        }
      >
        <div className={s.title}>{opts?.title ?? 'Confirmar'}</div>
        <div className={s.message}>{opts?.message}</div>
      </Modal>
    </ConfirmContext.Provider>
  )
}
