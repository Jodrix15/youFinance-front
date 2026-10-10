import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  useCuentasInversion,
  useInversiones,
  useInversionTotales,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import { Tabs } from '@/components/ui/Tabs'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur, formatPct, currencySymbol } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import CuentaInversionModal from '@/components/inversiones/CuentaInversionModal'
import {
  EditarInversionModal,
  NuevaInversionModal,
} from '@/components/inversiones/InversionModals'
import PosicionesAgrupadas, { type GrupoPosiciones } from '@/components/inversiones/PosicionesAgrupadas'
import {
  RepartirInversionModal,
  SinCuentaModal,
} from '@/components/inversiones/RepartirInversionModal'
import { colorCuenta, nombreActivo, plataformaLabel } from '@/components/inversiones/common'
import type { CuentaInversionResponse, InversionResponse } from '@/types/api'
import s from './Inversiones.module.css'

type Pestana = 'cuentas' | 'posiciones'
type Agrupacion = 'cuenta' | 'clase'

/** Grupo del acordeón de posiciones (una cuenta o una clase de activo). */
type Grupo = {
  key: string
  nombre: string
  color: string
  items: InversionResponse[]
  aportado: number
  valor: number
  plusvalia: number
  pct: number
}

const SIN_CUENTA_KEY = 'sin-cuenta'
const sum = (xs: number[]) => xs.reduce((a, b) => a + Number(b || 0), 0)

function totales(items: InversionResponse[]) {
  const aportado = sum(items.map((i) => i.capitalAportado))
  const valor = sum(items.map((i) => i.capitalTotal))
  const plusvalia = valor - aportado
  return { aportado, valor, plusvalia, pct: aportado ? (plusvalia / aportado) * 100 : 0 }
}

export default function Inversiones() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { data: inversiones, isLoading, isError, error } = useInversiones()
  const { data: cuentas, isLoading: cuentasLoading } = useCuentasInversion()
  const {
    valorTotal,
    aportadoTotal,
    plusvaliaTotal,
    porcentajeTotal,
    isLoading: totalesLoading,
  } = useInversionTotales()

  const [pestana, setPestana] = useState<Pestana>('cuentas')
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('clase')

  const [nuevaCuentaOpen, setNuevaCuentaOpen] = useState(false)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [sinCuentaOpen, setSinCuentaOpen] = useState(false)
  // Edición desde la vista de posiciones (por categoría o por cuenta).
  const [editando, setEditando] = useState<InversionResponse | null>(null)
  const [separando, setSeparando] = useState<InversionResponse | null>(null)
  const [nuevaPreset, setNuevaPreset] = useState<{ cuentaId?: number; categoria?: string }>({})

  function abrirNueva(preset: { cuentaId?: number; categoria?: string } = {}) {
    setNuevaPreset(preset)
    setNuevaOpen(true)
  }

  /** "+ Añadir a …" de un grupo: preselecciona su categoría o su cuenta. */
  function anadirAGrupo(g: GrupoPosiciones) {
    if (agrupacion === 'clase') abrirNueva({ categoria: g.items[0]?.categoriaNombre ?? undefined })
    else if (g.key.startsWith('c-')) abrirNueva({ cuentaId: Number(g.key.slice(2)) })
    else abrirNueva()
  }

  const list = useMemo(() => inversiones ?? [], [inversiones])
  const cuentasList = useMemo(() => cuentas ?? [], [cuentas])
  const sinCuenta = useMemo(() => list.filter((i) => i.cuentaId == null), [list])

  // Por clase de activo (categoría de la inversión). Base de los gráficos,
  // que siempre van por activo, y de la agrupación "Por categoría".
  const gruposClase: Grupo[] = useMemo(() => {
    const porCat = new Map<string, InversionResponse[]>()
    list.forEach((i) => {
      const k = String(i.categoriaId ?? `i${i.id}`)
      porCat.set(k, [...(porCat.get(k) ?? []), i])
    })
    return [...porCat.entries()]
      .map(([k, items], idx) => ({
        key: `k-${k}`,
        nombre: items[0].categoriaNombre ?? `#${items[0].id}`,
        color: items[0].categoriaColor ?? PALETTE[idx % PALETTE.length],
        items,
        ...totales(items),
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [list])

  const gruposCuenta: Grupo[] = useMemo(() => {
    const gs: Grupo[] = cuentasList.map((c, idx) => {
      const items = list.filter((i) => i.cuentaId === c.id)
      return { key: `c-${c.id}`, nombre: c.nombre, color: colorCuenta(c.color, idx), items, ...totales(items) }
    })
    if (sinCuenta.length > 0) {
      gs.push({
        key: SIN_CUENTA_KEY,
        nombre: 'Sin cuenta',
        color: 'var(--gray)',
        items: sinCuenta,
        ...totales(sinCuenta),
      })
    }
    return gs
  }, [cuentasList, list, sinCuenta])

  const grupos = agrupacion === 'cuenta' ? gruposCuenta : gruposClase

  if (isLoading || totalesLoading || cuentasLoading) {
    return (
      <div>
        <div className={s.kpis}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={s.kpi}>
              <Skeleton width={90} height={11} />
              <Skeleton width={110} height={24} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
        <div className={`card ${s.cardBlock}`}>
          <Skeleton width={180} height={28} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width={240} height={160} radius="var(--r-lg)" />
            ))}
          </div>
        </div>
      </div>
    )
  }
  if (isError) return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(error)}</p>

  // ── Pestaña Cuentas ──
  const repartoTotal = sum(cuentasList.map((c) => c.valorTotal)) + totales(sinCuenta).valor
  const reparto = [
    ...cuentasList.map((c, idx) => ({
      key: `c-${c.id}`,
      nombre: c.nombre,
      color: colorCuenta(c.color, idx),
      valor: c.valorTotal,
    })),
    ...(sinCuenta.length
      ? [{ key: SIN_CUENTA_KEY, nombre: 'Sin cuenta', color: 'var(--gray)', valor: totales(sinCuenta).valor }]
      : []),
  ].filter((r) => r.valor > 0)

  const tarjetaCuenta = (c: CuentaInversionResponse, idx: number) => {
    const posiciones = list.filter((i) => i.cuentaId === c.id)
    const nombres = posiciones.map(nombreActivo).join(', ')
    return (
      <button
        key={c.id}
        type="button"
        className={s.acc}
        style={{ ['--c' as string]: colorCuenta(c.color, idx) }}
        onClick={() => navigate(`/inversiones/cuentas/${c.id}`)}
      >
        <div className={s.accHead}>
          <div className={s.accName}>{c.nombre}</div>
          {plataformaLabel(c.plataforma) && <span className={s.tag}>{plataformaLabel(c.plataforma)}</span>}
        </div>
        <div className={s.accVal}>{formatEur(c.valorTotal)}</div>
        <div className={s.accRow}>
          <span>Aportado</span>
          <b>{formatEur(c.capitalAportado)}</b>
        </div>
        <div className={s.accRow}>
          <span>Plusvalía</span>
          <b style={{ color: c.plusvalia >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {c.plusvalia >= 0 ? '+' : ''}
            {formatEur(c.plusvalia)} · {formatPct(c.porcentajePlusvalia)}
          </b>
        </div>
        <div className={s.accRow}>
          <span>Rendimientos 12 m</span>
          <b style={{ color: c.rendimientos12m > 0 ? 'var(--up)' : undefined }}>
            {formatEur(c.rendimientos12m)}
          </b>
        </div>
        <div className={s.accFoot}>
          {c.numPosiciones} {c.numPosiciones === 1 ? 'posición' : 'posiciones'}
          {nombres && ` · ${nombres}`}
          {c.efectivo !== 0 && ` · ${formatEur(c.efectivo)} en efectivo`}
        </div>
      </button>
    )
  }

  // ── Gráficos: siempre por clase de activo ──
  const t = chartTheme()
  const gruposConValor = gruposClase
  const doughnut = {
    labels: gruposConValor.map((g) => g.nombre),
    datasets: [
      {
        data: gruposConValor.map((g) => g.valor),
        backgroundColor: gruposConValor.map((g) => g.color),
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }
  const bar = {
    labels: gruposConValor.map((g) => g.nombre),
    datasets: [
      {
        label: `Plusvalía (${currencySymbol()})`,
        data: gruposConValor.map((g) => g.plusvalia),
        // Verde/rojo por signo: este gráfico responde a "¿gano o pierdo?".
        backgroundColor: gruposConValor.map((g) => (g.plusvalia >= 0 ? '#1d9e75' : '#f85149')),
        borderRadius: 4,
      },
    ],
  }
  const numPosiciones = list.length

  return (
    <div>
      <StatGrid>
        <StatCard
          label="Total invertido"
          value={formatEur(valorTotal)}
          hint={`${cuentasList.length} ${cuentasList.length === 1 ? 'cuenta' : 'cuentas'} · ${numPosiciones} ${numPosiciones === 1 ? 'posición' : 'posiciones'}`}
        />
        <StatCard label="Capital aportado" value={formatEur(aportadoTotal)} />
        <StatCard
          label="Plusvalía total"
          value={formatEur(plusvaliaTotal)}
          color={plusvaliaTotal >= 0 ? 'var(--up)' : 'var(--down)'}
          hint={formatPct(porcentajeTotal)}
        />
        <StatCard
          label="Rentabilidad media"
          value={formatPct(porcentajeTotal)}
          color={porcentajeTotal >= 0 ? 'var(--up)' : 'var(--down)'}
        />
      </StatGrid>

      {list.length > 0 && (
      <div className={s.charts}>
        <div className="card">
          <div className="sec-title">Distribución por categoría</div>
          <div className={s.chartBox}>
            <Doughnut
              key={`d-${theme}`}
              data={doughnut}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: t.tick, boxWidth: 12, font: { size: 11 } },
                  },
                  tooltip: {
                    callbacks: {
                      label: (c) => {
                        const arr = c.dataset.data as number[]
                        const tot = arr.reduce((a, b) => a + Number(b || 0), 0)
                        const pct = tot ? (Number(c.parsed) / tot) * 100 : 0
                        return ` ${c.label}: ${formatEur(c.parsed)} · ${formatPct(pct)}`
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        <div className="card">
          <div className="sec-title">Plusvalía por categoría</div>
          <div className={s.chartBox}>
            <Bar
              key={`b-${theme}`}
              data={bar}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (c) => {
                        const g = gruposConValor[c.dataIndex]
                        return ` Plusvalía: ${formatEur(Number(c.raw))} · ${formatPct(g ? g.pct : null)}`
                      },
                    },
                  },
                },
                scales: {
                  x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { size: 11 } } },
                  y: { grid: { display: false }, ticks: { color: t.tick, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>
      </div>
      )}

      <div className={`card ${s.cardBlock}`}>
        <div className={s.blockHead}>
          <Tabs<Pestana>
            value={pestana}
            onChange={setPestana}
            options={[
              { value: 'cuentas', label: 'Cuentas' },
              { value: 'posiciones', label: 'Posiciones' },
            ]}
          />
          <div className={s.headActions}>
            {pestana === 'posiciones' && (
              <div className={s.agrupar}>
                <span>Agrupar:</span>
                <Tabs<Agrupacion>
                  value={agrupacion}
                  onChange={setAgrupacion}
                  options={[
                    { value: 'clase', label: 'Por categoría' },
                    { value: 'cuenta', label: 'Por cuenta' },
                  ]}
                />
              </div>
            )}
            {pestana === 'cuentas' ? (
              <button type="button" className={`${s.btn} ${s.btnCompact}`} onClick={() => setNuevaCuentaOpen(true)}>
                + Nueva cuenta
              </button>
            ) : (
              <button type="button" className={`${s.btn} ${s.btnCompact}`} onClick={() => abrirNueva()}>
                + Añadir inversión
              </button>
            )}
          </div>
        </div>

        {pestana === 'cuentas' &&
          (cuentasList.length === 0 && sinCuenta.length === 0 ? (
            <EmptyState
              message="Aún no tienes cuentas de inversión. Crea una por cada plataforma (Mintos, un broker…) para ver qué tienes en cada una."
              actionLabel="Crear tu primera cuenta"
              onAction={() => setNuevaCuentaOpen(true)}
            />
          ) : (
            <>
              {reparto.length > 0 && repartoTotal > 0 && (
                <>
                  <div className="sec-title" style={{ marginBottom: 4 }}>
                    Reparto por cuenta
                  </div>
                  <div className={s.stack}>
                    {reparto.map((r) => (
                      <i
                        key={r.key}
                        title={`${r.nombre}: ${formatEur(r.valor)}`}
                        style={{ width: `${(r.valor / repartoTotal) * 100}%`, background: r.color }}
                      />
                    ))}
                  </div>
                  <div className={s.legend}>
                    {reparto.map((r) => (
                      <span key={r.key}>
                        <i className={s.legendDot} style={{ background: r.color }} />
                        {r.nombre} {formatPct((r.valor / repartoTotal) * 100)}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <div className={s.accs}>
                {cuentasList.map(tarjetaCuenta)}
                {sinCuenta.length > 0 && (
                  <button
                    type="button"
                    className={s.acc}
                    style={{ ['--c' as string]: 'var(--gray)' }}
                    onClick={() => setSinCuentaOpen(true)}
                  >
                    <div className={s.accHead}>
                      <div className={s.accName}>Sin cuenta</div>
                    </div>
                    <div className={s.accVal}>{formatEur(totales(sinCuenta).valor)}</div>
                    <div className={s.accRow}>
                      <span>Aportado</span>
                      <b>{formatEur(totales(sinCuenta).aportado)}</b>
                    </div>
                    <div className={s.accFoot}>
                      {sinCuenta.length} {sinCuenta.length === 1 ? 'posición' : 'posiciones'} sin
                      asignar · pulsa para pasarlas a una cuenta o repartirlas
                    </div>
                  </button>
                )}
                <button type="button" className={s.accAdd} onClick={() => setNuevaCuentaOpen(true)}>
                  <div>
                    <strong>+ Añadir cuenta</strong>
                    Mintos, Indexa, Degiro, un banco…
                  </div>
                </button>
              </div>
            </>
          ))}

        {pestana === 'posiciones' && (
          <>
            {list.length === 0 ? (
              <EmptyState
                message="Aún no tienes inversiones. Crea la primera para seguir su rentabilidad."
                actionLabel="Añadir tu primera inversión"
                onAction={() => abrirNueva()}
              />
            ) : (
              <PosicionesAgrupadas
                key={agrupacion}
                grupos={grupos}
                segunda={agrupacion === 'clase' ? 'cuenta' : 'categoria'}
                onEdit={setEditando}
                onAdd={anadirAGrupo}
              />
            )}
          </>
        )}
      </div>

      <CuentaInversionModal open={nuevaCuentaOpen} onClose={() => setNuevaCuentaOpen(false)} />
      <NuevaInversionModal
        open={nuevaOpen}
        onClose={() => setNuevaOpen(false)}
        cuentaIdInicial={nuevaPreset.cuentaId}
        categoriaInicial={nuevaPreset.categoria}
      />
      <EditarInversionModal
        inversion={editando}
        onClose={() => setEditando(null)}
        onSeparar={(i) => {
          setEditando(null)
          setSeparando(i)
        }}
      />
      <RepartirInversionModal inversion={separando} onClose={() => setSeparando(null)} />
      <SinCuentaModal open={sinCuentaOpen} onClose={() => setSinCuentaOpen(false)} />
    </div>
  )
}
