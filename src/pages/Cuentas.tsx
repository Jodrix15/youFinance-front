import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrearCuenta, useCuentas, useResumenCuenta } from '@/hooks/useFinance'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import s from './Cuentas.module.css'

const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const NOW = new Date()
const CUR_MES = String(NOW.getMonth() + 1).padStart(2, '0')
const CUR_ANIO = String(NOW.getFullYear())
// Años seleccionables: el actual y los 6 anteriores.
const ANIOS = Array.from({ length: 7 }, (_, i) => String(NOW.getFullYear() - i))

export default function Cuentas() {
  const navigate = useNavigate()
  const { data: cuentas, isLoading, isError, error } = useCuentas()
  const crearCuenta = useCrearCuenta()

  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)
  const { data: resumen } = useResumenCuenta(
    fAnio === '' ? undefined : Number(fAnio),
    fMes === '' ? undefined : Number(fMes),
  )
  const [nombre, setNombre] = useState('')
  const [importe, setImporte] = useState('')
  const [err, setErr] = useState<{ field: string; msg: string } | null>(null)
  const fieldErr = (f: string) =>
    err?.field === f ? <div className={s.fieldError}>{err.msg}</div> : null

  const formRef = useRef<HTMLFormElement>(null)
  function irAlFormulario() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(
      () => formRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true }),
      350,
    )
  }

  if (isLoading) {
    return (
      <div>
        <div className={s.header}>
          <Skeleton width={130} height={26} />
          <Skeleton width={360} height={14} style={{ marginTop: 8 }} />
        </div>
        <div className={s.kpis}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className={`card ${s.cardBlock}`}>
          <Skeleton width={110} height={13} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={220} height={120} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  const list = cuentas ?? []
  const total = resumen?.totalCuentas ?? 0
  const ingresos = resumen?.ingresos ?? 0
  const gastos = resumen?.gastos ?? 0
  const diferencia = resumen?.diferencia ?? 0
  const numeroCuentas = resumen?.numeroCuentas ?? list.length

  async function submit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    const nom = nombre.trim()
    const imp = num(importe)
    if (!nom) return setErr({ field: 'nombre', msg: 'Indica el nombre de la cuenta.' })
    if (Number.isNaN(imp))
      return setErr({ field: 'importe', msg: 'Indica el saldo inicial (puede ser 0).' })
    try {
      await crearCuenta.mutateAsync({ nombreCuenta: nom, importe: imp })
      notifyOk('Cuenta creada')
      setNombre('')
      setImporte('')
    } catch (error) {
      notifyError(error)
    }
  }

  return (
    <div>
      <div className={s.header}>
        <h1>Cuentas</h1>
        <p>Tus cuentas y su saldo. Haz clic en una para ver sus movimientos.</p>
      </div>

      <div className={s.filters}>
        <div className={s.filterSelect}>
          <Select
            value={fMes}
            options={[
              { value: '', label: 'Todos los meses' },
              ...MESES.map((mes, idx) => ({
                value: String(idx + 1).padStart(2, '0'),
                label: mes,
              })),
            ]}
            onChange={setFMes}
            ariaLabel="Filtrar por mes"
          />
        </div>
        <div className={s.filterSelect}>
          <Select
            value={fAnio}
            options={[
              { value: '', label: 'Todos los años' },
              ...ANIOS.map((y) => ({ value: y, label: y })),
            ]}
            onChange={setFAnio}
            ariaLabel="Filtrar por año"
          />
        </div>
      </div>

      <div className={s.kpis}>
        <div className={s.kpi}><div className={s.kpiLabel}>Total en cuentas</div><div className={s.kpiValue}>{formatEur(total)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Ingresos</div><div className={s.kpiValue} style={{ color: 'var(--up)' }}>{formatEur(ingresos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Gastos</div><div className={s.kpiValue} style={{ color: 'var(--down)' }}>{formatEur(gastos)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Diferencia</div><div className={s.kpiValue} style={{ color: diferencia >= 0 ? 'var(--up)' : 'var(--down)' }}>{formatEur(diferencia)}</div></div>
        <div className={s.kpi}><div className={s.kpiLabel}>Nº de cuentas</div><div className={s.kpiValue}>{numeroCuentas}</div></div>
      </div>

      <div className={`card ${s.cardBlock}`}>
        <div className="sec-title">Mis cuentas</div>
        {list.length === 0 ? (
          <EmptyState
            message="Aún no tienes cuentas. Empieza creando la primera para ver aquí tu saldo."
            actionLabel="Añadir tu primera cuenta"
            onAction={irAlFormulario}
          />
        ) : (
          <div className={s.grid}>
            {list.map((c) => (
              <div key={c.id} className={s.cuentaCard} onClick={() => navigate(`/cuentas/${c.id}`)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/cuentas/${c.id}`)}>
                <div className={s.cuentaTop}>
                  <div className={s.cuentaIcon}><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h11A1.5 1.5 0 0 1 15 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5zm10.5 5a1 1 0 1 0 0 2 1 1 0 0 0 0-2M2 5h12V4H2z" /></svg></div>
                  <div className={s.cuentaName}>{c.nombreCuenta}</div>
                </div>
                <div className={s.cuentaSaldo}>{formatEur(c.importe)}</div>
                <div className={s.cuentaLink}>Ver movimientos →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form ref={formRef} className={`card ${s.cardBlock}`} onSubmit={submit} noValidate>
        <div className="sec-title">Añadir cuenta</div>
        <div className={s.row}>
          <div className={s.field}><label>Nombre</label><input type="text" placeholder="Ej: Cuenta corriente" value={nombre} aria-invalid={err?.field === 'nombre'} onChange={(e) => { setNombre(e.target.value); setErr(null) }} />{fieldErr('nombre')}</div>
          <div className={s.field}><label>Saldo inicial (€)</label><input type="number" step="0.01" placeholder="0,00" value={importe} aria-invalid={err?.field === 'importe'} onChange={(e) => { setImporte(e.target.value); setErr(null) }} />{fieldErr('importe')}</div>
        </div>
        <button className={s.btn} type="submit" disabled={crearCuenta.isPending} style={{ marginTop: 4 }}>{crearCuenta.isPending ? 'Guardando…' : 'Añadir cuenta'}</button>
      </form>
    </div>
  )
}
