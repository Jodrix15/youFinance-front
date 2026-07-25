import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrearCuenta, useCuentas, useEliminarCuenta, useResumenCuenta } from '@/hooks/useFinance'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmProvider'
import { notifyOk, notifyError } from '@/lib/notify'
import { formatEur } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import Select from '@/components/ui/Select'
import MoneyInput from '@/components/ui/MoneyInput'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
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
  const eliminarCuenta = useEliminarCuenta()
  const confirm = useConfirm()

  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)
  const { data: resumen, isLoading: resumenLoading } = useResumenCuenta(
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

  if (isLoading || resumenLoading) {
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

  async function handleDelete(id: number, nombre: string) {
    const ok = await confirm({
      title: 'Eliminar cuenta',
      message: `¿Seguro que quieres eliminar la cuenta "${nombre}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await eliminarCuenta.mutateAsync(id)
      notifyOk('Cuenta eliminada')
    } catch (error) {
      // El backend responde 409 si la cuenta tiene transacciones asociadas.
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

      <StatGrid>
        <StatCard label="Total en cuentas" value={formatEur(total)} />
        <StatCard label="Ingresos" value={formatEur(ingresos)} color="var(--up)" />
        <StatCard label="Gastos" value={formatEur(gastos)} color="var(--down)" />
        <StatCard
          label="Diferencia"
          value={formatEur(diferencia)}
          color={diferencia >= 0 ? 'var(--up)' : 'var(--down)'}
        />
        <StatCard label="Nº de cuentas" value={numeroCuentas} />
      </StatGrid>

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
                  <button
                    type="button"
                    className={s.deleteBtn}
                    aria-label={`Eliminar cuenta ${c.nombreCuenta}`}
                    title="Eliminar cuenta"
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.nombreCuenta) }}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z" /><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z" /></svg>
                  </button>
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
          <div className={s.field}><label>Saldo inicial</label><MoneyInput step="0.01" min="0" placeholder="0,00" value={importe} aria-invalid={err?.field === 'importe'} onChange={(e) => { setImporte(e.target.value); setErr(null) }} />{fieldErr('importe')}</div>
        </div>
        <button className={s.btn} type="submit" disabled={crearCuenta.isPending} style={{ marginTop: 4 }}>{crearCuenta.isPending ? 'Guardando…' : 'Añadir cuenta'}</button>
      </form>
    </div>
  )
}
