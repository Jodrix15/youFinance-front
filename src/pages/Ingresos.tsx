import { useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  useIngresosEvolucion,
  useIngresosPorCategoria,
  useIngresosResumen,
} from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import Skeleton from '@/components/ui/Skeleton'
import Select from '@/components/ui/Select'
import { Tabs } from '@/components/ui/Tabs'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { DonutChart } from '@/components/ui/DonutChart'
import { chartTheme, crosshairPlugin, hoverIndex, puntoHover, tooltipTheme } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { apiErrorMessage } from '@/lib/api'
import type { OrigenIngreso } from '@/types/api'
import s from './Ingresos.module.css'

// Metadatos de cada familia (orden, etiqueta y color). null = ingresos cuya
// categoría aún no tiene familia asignada. Los colores van en hex (no var CSS)
// porque Chart.js pinta sobre canvas y no resuelve variables CSS.
const FAMILIAS: { key: OrigenIngreso; label: string; color: string }[] = [
  { key: 'ACTIVO', label: 'Activo', color: '#1d9e75' },
  { key: 'PASIVO', label: 'Pasivo', color: '#2f81f7' },
  { key: 'INVERSION', label: 'Inversión', color: '#8b7ec8' },
]

const SIN_CLASIFICAR = { label: 'Sin clasificar', color: '#6e7681' }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const NOW = new Date()
const CUR_MES = String(NOW.getMonth() + 1).padStart(2, '0')
const CUR_ANIO = String(NOW.getFullYear())
// Años seleccionables: el actual y los 6 anteriores.
const ANIOS = Array.from({ length: 7 }, (_, i) => String(NOW.getFullYear() - i))

// Rangos de la curva de evolución (mismos que el widget de patrimonio).
type Range = 'YTD' | '1A' | '5A' | 'MAX'
const RANGES: { value: Range; label: string }[] = [
  { value: 'YTD', label: 'YTD' },
  { value: '1A', label: '1 año' },
  { value: '5A', label: '5 años' },
  { value: 'MAX', label: 'Máx' },
]
const pad = (n: number) => String(n).padStart(2, '0')

function meta(familia: OrigenIngreso | null) {
  return FAMILIAS.find((f) => f.key === familia) ?? SIN_CLASIFICAR
}

// Campo de la serie de evolución que corresponde a cada familia.
const CAMPO_EVOLUCION: Record<OrigenIngreso, 'activo' | 'pasivo' | 'inversion'> = {
  ACTIVO: 'activo',
  PASIVO: 'pasivo',
  INVERSION: 'inversion',
}

type MesEvolucion = {
  activo: number
  pasivo: number
  inversion: number
  sinClasificar: number
}

/** Partes no nulas de un mes, en el orden de FAMILIAS y con "Sin clasificar" al final. */
function desgloseMes(e: MesEvolucion) {
  return [
    ...FAMILIAS.map((f) => ({ label: f.label, valor: e[CAMPO_EVOLUCION[f.key]] })),
    { label: SIN_CLASIFICAR.label, valor: e.sinClasificar },
  ].filter((p) => p.valor > 0)
}

export default function Ingresos() {
  const { theme } = useTheme()
  const [fMes, setFMes] = useState(CUR_MES)
  const [fAnio, setFAnio] = useState(CUR_ANIO)

  const params = {
    anio: fAnio === '' ? undefined : Number(fAnio),
    mes: fMes === '' ? undefined : Number(fMes),
  }
  const resumen = useIngresosResumen(params)
  const porCategoria = useIngresosPorCategoria(params)
  // La curva de evolución es independiente del filtro mes/año: tiene su propio
  // selector de rango (YTD / 1 año / 5 años / Máx), como el widget de patrimonio.
  const evolucion = useIngresosEvolucion()
  const [range, setRange] = useState<Range>('1A')

  const total = resumen.data?.total ?? 0
  const familias = resumen.data?.familias ?? []
  const categorias = porCategoria.data ?? []

  const porFamilia = familias.reduce<Record<string, { total: number; pct: number }>>(
    (acc, f) => {
      acc[f.familia ?? 'SIN'] = { total: Number(f.total || 0), pct: Number(f.porcentaje || 0) }
      return acc
    },
    {},
  )

  const donutFamilias = [
    ...FAMILIAS.map((f) => ({ ...f, ...porFamilia[f.key] })),
    ...(porFamilia['SIN'] ? [{ key: 'SIN', ...SIN_CLASIFICAR, ...porFamilia['SIN'] }] : []),
  ].filter((f) => (f.total ?? 0) > 0)

  const t = chartTheme()

  // Serie mensual continua dentro del rango elegido: los meses SIN ingresos
  // entre dos meses con ingresos sí se rellenan a cero (ahí el cero es un dato
  // real). Lo que no se hace es prolongar la serie hasta hoy: los ceros del
  // final hundían la curva en cuanto empezaba un mes nuevo, cuando lo único
  // que pasa es que todavía no se ha registrado nada.
  const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
  const mesDe = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, 1)
  const evoDatos = evolucion.data ?? []
  const evoMap = new Map(evoDatos.map((e) => [e.mes.slice(0, 7), e]))
  const primerMes = evoDatos[0] ? mesDe(evoDatos[0].mes) : null
  const ultimoMes = evoDatos.length > 0 ? mesDe(evoDatos[evoDatos.length - 1].mes) : null
  const hoyMes = new Date(NOW.getFullYear(), NOW.getMonth(), 1)

  const evoEnd = ultimoMes ?? hoyMes
  let evoStart: Date
  if (range === 'YTD') evoStart = new Date(NOW.getFullYear(), 0, 1)
  else if (range === '1A') evoStart = new Date(NOW.getFullYear(), NOW.getMonth() - 11, 1)
  else if (range === '5A') evoStart = new Date(NOW.getFullYear(), NOW.getMonth() - 59, 1)
  // Máx: desde el primer mes con ingresos.
  else evoStart = primerMes ?? evoEnd
  const evoVacio = { total: 0, activo: 0, pasivo: 0, inversion: 0, sinClasificar: 0 }
  const evoFiltrada: (typeof evoVacio & { mes: string })[] = []
  const evoCur = new Date(evoStart)
  while (evoCur <= evoEnd) {
    const k = monthKey(evoCur)
    const e = evoMap.get(k)
    evoFiltrada.push({
      mes: `${k}-01`,
      total: Number(e?.total || 0),
      activo: Number(e?.activo || 0),
      pasivo: Number(e?.pasivo || 0),
      inversion: Number(e?.inversion || 0),
      sinClasificar: Number(e?.sinClasificar || 0),
    })
    evoCur.setMonth(evoCur.getMonth() + 1)
  }
  const evoLabels = evoFiltrada.map((e) => `${e.mes.slice(5, 7)}/${e.mes.slice(2, 4)}`)
  const evoPuntos = evoFiltrada.length <= 2 ? 4 : 0

  if (resumen.isError) {
    return <p style={{ color: 'var(--down)' }}>{apiErrorMessage(resumen.error)}</p>
  }

  return (
    <div>
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

      {resumen.isLoading ? (
        <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={72} radius="var(--r-lg)" />
          ))}
        </div>
      ) : (
        // Aunque el mes no tenga ingresos se siguen mostrando los KPIs (un
        // total a cero también es información) y la evolución, que tiene su
        // propio selector de rango y no depende del filtro de mes/año. Los dos
        // bloques de abajo sí dependen del periodo y avisan por su cuenta.
        <>
          <StatGrid>
            <StatCard label="Total ingresos" value={formatEur(total)} color="var(--up)" />
            {FAMILIAS.map((f) => {
              const d = porFamilia[f.key]
              return (
                <StatCard
                  key={f.key}
                  label={f.label}
                  color={f.color}
                  value={
                    <>
                      {formatEur(d?.total ?? 0)}
                      <span style={{ fontSize: 12, color: 'var(--tx2)', marginLeft: 8 }}>
                        {formatPct(d?.pct ?? 0)}
                      </span>
                    </>
                  }
                />
              )
            })}
          </StatGrid>

          <div className={`card ${s.cardBlock}`}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              <div className="sec-title" style={{ marginBottom: 0 }}>
                Evolución de ingresos
              </div>
              <Tabs options={RANGES} value={range} onChange={setRange} />
            </div>
            <div className={s.chartBox}>
              {evolucion.isLoading ? (
                <Skeleton width="100%" height="100%" radius="var(--r-lg)" />
              ) : evolucion.isError ? (
                <p style={{ color: 'var(--down)', fontSize: 14 }}>
                  No se pudo cargar la evolución.
                </p>
              ) : evoFiltrada.length === 0 ? (
                <p style={{ color: 'var(--tx2)', fontSize: 14 }}>
                  Sin ingresos en el rango seleccionado.
                </p>
              ) : (
                <Line
                  key={`ing-${theme}-${range}`}
                  plugins={[crosshairPlugin]}
                  data={{
                    labels: evoLabels,
                    datasets: [
                      {
                        label: 'Ingresos',
                        data: evoFiltrada.map((e) => Number(e.total || 0)),
                        borderColor: '#1d9e75',
                        backgroundColor: 'rgba(29,158,117,0.15)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: evoPuntos,
                        pointBackgroundColor: '#1d9e75',
                        borderWidth: 2,
                        ...puntoHover(),
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    // El hover engancha la columna entera y marca el punto.
                    interaction: hoverIndex,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...tooltipTheme(),
                        callbacks: {
                          label: (c) => ` Total: ${formatEur(Number(c.parsed.y))}`,
                          // Desglose por familia del mes bajo el puntero.
                          afterBody: (items) => {
                            const e = evoFiltrada[items[0]?.dataIndex ?? -1]
                            if (!e) return []
                            return desgloseMes(e).map(
                              (p) => `   ${p.label}: ${formatEur(p.valor)}`,
                            )
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: t.tick, font: { size: 10 }, maxTicksLimit: 8 },
                      },
                      y: {
                        grid: { color: t.grid },
                        ticks: { color: t.tick, font: { size: 10 }, callback: (v) => formatEur(Number(v), false) },
                      },
                    },
                  }}
                />
              )}
            </div>
          </div>

          <div className={s.charts}>
            <div className="card">
              <div className="sec-title">Reparto por familia</div>
              {donutFamilias.length === 0 ? (
                <p style={{ color: 'var(--tx2)', fontSize: 14 }}>
                  Sin ingresos en el periodo. Añade transacciones de tipo Ingreso y asigna
                  una familia a sus categorías.
                </p>
              ) : (
                <div className={s.chartBox}>
                  <DonutChart
                    labels={donutFamilias.map((f) => f.label)}
                    values={donutFamilias.map((f) => f.total ?? 0)}
                    colors={donutFamilias.map((f) => f.color)}
                    tooltipLabel={(c) => {
                      const pct = total ? (Number(c.parsed) / total) * 100 : 0
                      return ` ${c.label}: ${formatEur(Number(c.parsed))} · ${formatPct(pct)}`
                    }}
                  />
                </div>
              )}
            </div>

            <div className="card">
              <div className="sec-title">Detalle por categoría</div>
              {categorias.length === 0 ? (
                <p style={{ color: 'var(--tx2)', fontSize: 14 }}>Sin ingresos en el periodo.</p>
              ) : (
                <div>
                  {categorias.map((c) => {
                    const m = meta(c.familia)
                    // El punto y la barra llevan el color propio de la categoría;
                    // la etiqueta de familia conserva el color de su familia.
                    const cColor = c.color ?? m.color
                    const pct = total ? (Number(c.total || 0) / total) * 100 : 0
                    return (
                      <div key={`${c.categoria}-${c.familia ?? 'SIN'}`} className={s.row}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: cColor,
                            flexShrink: 0,
                          }}
                        />
                        <span className={s.rowName}>{c.categoria}</span>
                        <span
                          className={s.badge}
                          style={{ color: m.color, border: `1px solid ${m.color}` }}
                        >
                          {m.label}
                        </span>
                        <div className={s.track}>
                          <div
                            className={s.fill}
                            style={{ width: `${pct}%`, background: cColor }}
                          />
                        </div>
                        <span className={s.rowAmount}>{formatEur(c.total)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
