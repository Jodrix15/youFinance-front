import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import {
  useCuentaInversion,
  useCuentas,
  useInversiones,
  useRendimientosCuenta,
  useTransacciones,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import CuentaInversionModal from '@/components/inversiones/CuentaInversionModal'
import RetirarModal from '@/components/inversiones/RetirarModal'
import { NuevaInversionModal } from '@/components/inversiones/InversionModals'
import PosicionesTabla from '@/components/inversiones/PosicionesTabla'
import { colorCuenta, plataformaLabel } from '@/components/inversiones/common'
import type { TransaccionResponse } from '@/types/api'
import s from './Inversiones.module.css'

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const fechaCorta = (iso: string) => {
  const [, m, d] = iso.split('-')
  return `${d} ${MESES_CORTOS[Number(m) - 1] ?? ''}`
}

/** Icono y texto de un movimiento de la cuenta de inversión. */
function describir(t: TransaccionResponse): { ico: string; titulo: string; detalle: string } {
  if (t.tipoMovimiento === 'TRANSFERENCIA') {
    return t.importe < 0
      ? { ico: '↑', titulo: 'Retirada', detalle: `a ${t.cuentaContrapartidaNombre ?? 'otra cuenta'}` }
      : { ico: '↓', titulo: 'Transferencia recibida', detalle: `desde ${t.cuentaContrapartidaNombre ?? 'otra cuenta'}` }
  }
  if (t.tipoMovimiento === 'INGRESO')
    return { ico: '%', titulo: t.descripcion || t.categoriaNombre || 'Rendimiento', detalle: t.categoriaNombre ?? '' }
  if (t.tipoMovimiento === 'INVERSION')
    return {
      ico: t.importe < 0 ? '→' : '←',
      titulo: t.descripcion || (t.importe < 0 ? 'Aportación' : 'Venta'),
      detalle: t.categoriaNombre ?? '',
    }
  return { ico: '−', titulo: t.descripcion || t.categoriaNombre || 'Gasto', detalle: t.categoriaNombre ?? '' }
}

export default function InversionCuentaDetalle() {
  const { id } = useParams()
  const cuentaId = Number(id)
  const navigate = useNavigate()
  const { theme } = useTheme()

  const { data: cuenta, isLoading, isError, error } = useCuentaInversion(cuentaId)
  const { data: cuentas } = useCuentas()
  const { data: inversiones } = useInversiones()
  const { data: rendimientos } = useRendimientosCuenta(cuentaId)
  const { data: transacciones } = useTransacciones(cuentaId)

  const [editarCuentaOpen, setEditarCuentaOpen] = useState(false)
  const [retirarOpen, setRetirarOpen] = useState(false)
  const [nuevaOpen, setNuevaOpen] = useState(false)

  const posiciones = useMemo(
    () => (inversiones ?? []).filter((i) => i.cuentaId === cuentaId),
    [inversiones, cuentaId],
  )
  const cuentaRaw = (cuentas ?? []).find((c) => c.id === cuentaId) ?? null
  const ultimos = useMemo(
    () =>
      [...(transacciones ?? [])]
        .sort((a, b) => b.fechaTransaccion.localeCompare(a.fechaTransaccion) || b.id - a.id)
        .slice(0, 6),
    [transacciones],
  )

  if (isLoading) {
    return (
      <div>
        <Skeleton width={200} height={28} style={{ marginBottom: 16 }} />
        <div className={s.kpis}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (isError || !cuenta) {
    return (
      <div>
        <p style={{ color: isError ? 'var(--down)' : 'var(--tx2)', marginBottom: 12 }}>
          {isError ? apiErrorMessage(error) : 'Cuenta no encontrada.'}
        </p>
        <button type="button" className={s.btnGhost} onClick={() => navigate('/inversiones')}>
          ← Inversiones
        </button>
      </div>
    )
  }

  const color = colorCuenta(cuenta.color, 0)
  const t = chartTheme()
  const serie = rendimientos ?? []
  const barData = {
    labels: serie.map((r) => MESES_CORTOS[r.mes - 1]),
    datasets: [
      {
        label: 'Rendimientos',
        data: serie.map((r) => Number(r.importe || 0)),
        backgroundColor: '#1d9e75',
        borderRadius: 4,
      },
    ],
  }

  return (
    <div>
      <div className={s.crumb}>
        <Link to="/inversiones">Inversiones</Link> / {cuenta.nombre}
      </div>
      <div className={s.dhead}>
        <div className={s.dtitle}>
          <div className={s.logo} style={{ background: color }}>
            {cuenta.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{cuenta.nombre}</h2>
            <p>
              {[plataformaLabel(cuenta.plataforma), `${formatEur(cuenta.efectivo)} en efectivo`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className={s.headActions}>
          <button type="button" className={s.btnGhost} onClick={() => setEditarCuentaOpen(true)}>
            Editar cuenta
          </button>
          <button type="button" className={s.btnGhost} onClick={() => navigate(`/cuentas/${cuenta.id}`)}>
            Movimientos
          </button>
          <button type="button" className={s.btn} onClick={() => setRetirarOpen(true)}>
            Retirar
          </button>
        </div>
      </div>

      <StatGrid>
        <StatCard
          label="Valor actual"
          value={formatEur(cuenta.valorTotal)}
          hint={`${formatEur(cuenta.valorPosiciones)} invertido · ${formatEur(cuenta.efectivo)} efectivo`}
        />
        <StatCard label="Capital aportado" value={formatEur(cuenta.capitalAportado)} />
        <StatCard
          label="Plusvalía"
          value={`${cuenta.plusvalia >= 0 ? '+' : ''}${formatEur(cuenta.plusvalia)}`}
          color={cuenta.plusvalia >= 0 ? 'var(--up)' : 'var(--down)'}
          hint={formatPct(cuenta.porcentajePlusvalia)}
        />
        <StatCard
          label="Rendimientos 12 m"
          value={formatEur(cuenta.rendimientos12m)}
          color={cuenta.rendimientos12m > 0 ? 'var(--up)' : undefined}
          hint="Ingresos registrados en la cuenta"
        />
      </StatGrid>

      <div className={`card ${s.cardBlock}`}>
        <div className="block-head">
          <div className="sec-title">Posiciones en esta cuenta</div>
          <button type="button" className={s.btnGhost} onClick={() => setNuevaOpen(true)}>
            + Añadir posición
          </button>
        </div>
        {posiciones.length === 0 ? (
          <EmptyState
            message="Esta cuenta aún no tiene posiciones."
            actionLabel="Añadir la primera"
            onAction={() => setNuevaOpen(true)}
          />
        ) : (
          <PosicionesTabla
            items={posiciones}
            extra={{ label: 'Categoría', value: (i) => i.categoriaNombre ?? '—' }}
          />
        )}
      </div>

      <div className={s.two}>
        <div className="card">
          <div className="sec-title">Rendimientos por mes</div>
          <div className={s.chartBox}>
            <Bar
              key={`r-${theme}`}
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => {
                        const r = serie[items[0]?.dataIndex ?? 0]
                        return r ? `${MESES_CORTOS[r.mes - 1]} ${r.anio}` : ''
                      },
                      label: (c) => ` ${formatEur(Number(c.raw))}`,
                    },
                  },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                  y: {
                    beginAtZero: true,
                    grid: { color: t.grid },
                    ticks: { color: t.tick, font: { size: 11 } },
                  },
                },
              }}
            />
          </div>
          <p className={s.hint}>
            Registra los intereses o dividendos como ingresos en los movimientos de esta cuenta.
          </p>
        </div>
        <div className="card">
          <div className="block-head">
            <div className="sec-title">Últimos movimientos</div>
            <button type="button" className={s.linkBtn} onClick={() => navigate(`/cuentas/${cuenta.id}`)}>
              Ver todos →
            </button>
          </div>
          {ultimos.length === 0 ? (
            <p className={s.hint}>
              Sin movimientos. Para aportar, haz una transferencia desde tu cuenta corriente.
            </p>
          ) : (
            ultimos.map((m) => {
              const d = describir(m)
              return (
                <div key={m.id} className={s.mov}>
                  <div className={s.movIco}>{d.ico}</div>
                  <div className={s.movText}>
                    {d.titulo}
                    <small>
                      {fechaCorta(m.fechaTransaccion)}
                      {d.detalle && ` · ${d.detalle}`}
                    </small>
                  </div>
                  <div
                    className={s.movAmt}
                    style={{ color: m.importe >= 0 ? 'var(--up)' : 'var(--down)' }}
                  >
                    {m.importe >= 0 ? '+' : ''}
                    {formatEur(m.importe)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <CuentaInversionModal
        open={editarCuentaOpen && !!cuentaRaw}
        onClose={() => setEditarCuentaOpen(false)}
        cuenta={cuentaRaw}
        onDeleted={() => navigate('/inversiones')}
      />
      <RetirarModal
        open={retirarOpen}
        onClose={() => setRetirarOpen(false)}
        cuenta={cuenta}
        posiciones={posiciones}
      />
      <NuevaInversionModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        cuentaIdInicial={cuenta.id}
      />
    </div>
  )
}
