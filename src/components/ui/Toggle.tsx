import s from './Toggle.module.css'

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Texto que acompaña al interruptor. Si se omite, solo se pinta el interruptor. */
  label?: string
  /** Etiqueta accesible cuando no hay `label` visible. */
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Interruptor on/off. Detiene la propagación del clic para poder usarse dentro
 * de tarjetas que ya son clicables.
 */
export default function Toggle({ checked, onChange, label, ariaLabel, disabled }: Props) {
  return (
    <span className={s.wrap} onClick={(e) => e.stopPropagation()}>
      {label && (
        <span className={`${s.label} ${checked ? s.labelOn : ''}`}>{label}</span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        disabled={disabled}
        className={`${s.track} ${checked ? s.trackOn : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onChange(!checked)
        }}
      >
        <span className={`${s.knob} ${checked ? s.knobOn : ''}`} />
      </button>
    </span>
  )
}
