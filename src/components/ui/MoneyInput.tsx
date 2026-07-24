import { forwardRef, type InputHTMLAttributes } from 'react'
import { currencySymbol } from '@/lib/format'
import s from './MoneyInput.module.css'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de importe con el símbolo de la moneda activa (€, $, £…) como prefijo
 * dentro del propio campo. Usa type="number" para garantizar un valor con punto
 * decimal (los navegadores en es-ES aceptan también la coma al teclear), de modo
 * que el parseo posterior sigue siendo consistente.
 */
const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, style, ...props }, ref) => {
    return (
      <div className={s.wrap}>
        <span className={s.symbol} aria-hidden="true">
          {currencySymbol()}
        </span>
        <input
          ref={ref}
          type="number"
          inputMode="decimal"
          className={`${s.input} ${className ?? ''}`}
          // padding-left en línea para dejar hueco al símbolo por encima de los
          // estilos `.field input` de cada página (mayor especificidad).
          style={{ paddingLeft: 24, ...style }}
          {...props}
        />
      </div>
    )
  },
)

MoneyInput.displayName = 'MoneyInput'

export default MoneyInput
