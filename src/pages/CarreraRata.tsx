import { useReducer, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { financeApi } from '@/lib/finance'
import { useGastosFijosMes, useIngresosResumen } from '@/hooks/useFinance'
import { StatCard, StatGrid } from '@/components/ui/StatCard'
import { formatEur } from '@/lib/format'
import s from './CarreraRata.module.css'

// ── Contenido del juego ──────────────────────────────────────────────
// El juego NO da consejos: solo muestra números. El jugador descubre por sí
// mismo que los activos acercan la libertad y las tentaciones la alejan.

interface Oportunidad {
  nombre: string
  desc: string
  coste: number
  pasivo: number
}
interface Tentacion {
  nombre: string
  desc: string
  entrada: number
  gastoMensual: number
}

const OPORTUNIDADES: Oportunidad[] = [
  { nombre: 'Fondo indexado', desc: 'Bajo riesgo, rendimiento modesto.', coste: 2000, pasivo: 12 },
  { nombre: 'Acciones con dividendos', desc: 'Reparto periódico.', coste: 3000, pasivo: 28 },
  { nombre: 'Plaza de garaje en alquiler', desc: 'Alquiler estable.', coste: 8000, pasivo: 70 },
  { nombre: 'Participación en un negocio', desc: 'Más rendimiento, más riesgo.', coste: 5000, pasivo: 95 },
  { nombre: 'Piso pequeño para alquilar', desc: 'Necesitas colchón.', coste: 20000, pasivo: 190 },
  { nombre: 'Local comercial', desc: 'Un gran activo.', coste: 35000, pasivo: 330 },
]

const TENTACIONES: Tentacion[] = [
  { nombre: 'Coche nuevo a plazos', desc: 'Sube tus gastos cada mes.', entrada: 2000, gastoMensual: 250 },
  { nombre: 'Mudanza a un piso más caro', desc: 'Más nivel de vida.', entrada: 0, gastoMensual: 300 },
  { nombre: 'Suscripciones premium', desc: 'Pequeñas fugas mensuales.', entrada: 0, gastoMensual: 45 },
  { nombre: 'Móvil de gama alta a plazos', desc: 'Otra cuota fija.', entrada: 0, gastoMensual: 35 },
]

const IMPREVISTOS: { nombre: string; cantidad: number }[] = [
  { nombre: 'Avería en casa', cantidad: -800 },
  { nombre: 'Gasto médico inesperado', cantidad: -500 },
  { nombre: 'Reparación del coche', cantidad: -400 },
  { nombre: 'Una multa', cantidad: -200 },
  { nombre: 'Paga extra', cantidad: 1200 },
  { nombre: 'Devolución de Hacienda', cantidad: 600 },
  { nombre: 'Un regalo inesperado', cantidad: 300 },
]

const REFLEXIONES = [
  '¿Qué de esto hace que tu dinero trabaje por ti?',
  '¿Este movimiento te acerca o te aleja de cubrir tus gastos sin trabajar?',
  '¿Cuánto colchón necesitas antes de arriesgar?',
  '¿Qué pasaría el mes que viene si dejaras de cobrar tu sueldo?',
]

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

// ── Estado y reducer ─────────────────────────────────────────────────

type Status = 'setup' | 'playing' | 'won' | 'lost'
type Carta =
  | ({ tipo: 'oportunidad' } & Oportunidad)
  | ({ tipo: 'tentacion' } & Tentacion)

interface State {
  status: Status
  mes: number
  efectivo: number
  activo: number
  pasivo: number
  gastos: number
  activos: string[]
  opciones: Carta[]
  aviso: { texto: string; bueno: boolean } | null
  reflexion: string | null
  log: string[]
}

interface Seed {
  activo: number
  pasivo: number
  gastos: number
  efectivo: number
}

function generarOpciones(): Carta[] {
  const op: Carta = { tipo: 'oportunidad', ...pick(OPORTUNIDADES) }
  const otra: Carta =
    Math.random() < 0.5
      ? { tipo: 'oportunidad', ...pick(OPORTUNIDADES) }
      : { tipo: 'tentacion', ...pick(TENTACIONES) }
  return [op, otra]
}

function nuevoMes(prev: State): State {
  const mes = prev.mes + 1
  let efectivo = prev.efectivo + prev.activo + prev.pasivo - prev.gastos
  const log = [...prev.log]
  let aviso: State['aviso'] = null

  // Imprevisto ocasional (obliga a mantener colchón).
  if (Math.random() < 0.3) {
    const imp = pick(IMPREVISTOS)
    efectivo += imp.cantidad
    aviso = { texto: `${imp.nombre}: ${formatEur(imp.cantidad)}`, bueno: imp.cantidad > 0 }
    log.unshift(`Mes ${mes}: ${imp.nombre} (${formatEur(imp.cantidad)})`)
  }

  if (efectivo < 0) {
    return { ...prev, mes, efectivo, aviso, log, status: 'lost' }
  }
  if (prev.pasivo >= prev.gastos) {
    return { ...prev, mes, efectivo, aviso, log, status: 'won' }
  }

  const reflexion = mes % 4 === 0 ? pick(REFLEXIONES) : null
  return { ...prev, mes, efectivo, aviso, reflexion, log, opciones: generarOpciones() }
}

type Action =
  | { type: 'start'; seed: Seed }
  | { type: 'elegir'; carta: Carta }
  | { type: 'pasar' }
  | { type: 'reiniciar' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start': {
      const base: State = {
        status: 'playing',
        mes: 1,
        efectivo: action.seed.efectivo,
        activo: action.seed.activo,
        pasivo: action.seed.pasivo,
        gastos: action.seed.gastos,
        activos: [],
        opciones: generarOpciones(),
        aviso: null,
        reflexion: null,
        log: ['Empiezas tu partida. Objetivo: que tu ingreso pasivo cubra tus gastos.'],
      }
      // ¿Ya eres libre de partida?
      if (base.pasivo >= base.gastos) return { ...base, status: 'won' }
      return base
    }
    case 'elegir': {
      const c = action.carta
      let next = { ...state }
      if (c.tipo === 'oportunidad') {
        if (state.efectivo < c.coste) return state
        next.efectivo -= c.coste
        next.pasivo += c.pasivo
        next.activos = [...state.activos, c.nombre]
        next.log = [
          `Mes ${state.mes}: compraste ${c.nombre} (+${formatEur(c.pasivo)}/mes pasivo)`,
          ...state.log,
        ]
      } else {
        if (state.efectivo < c.entrada) return state
        next.efectivo -= c.entrada
        next.gastos += c.gastoMensual
        next.log = [
          `Mes ${state.mes}: ${c.nombre} (+${formatEur(c.gastoMensual)}/mes de gasto)`,
          ...state.log,
        ]
      }
      return nuevoMes(next)
    }
    case 'pasar':
      return nuevoMes({
        ...state,
        log: [`Mes ${state.mes}: decides ahorrar y esperar.`, ...state.log],
      })
    case 'reiniciar':
      return { ...state, status: 'setup' }
    default:
      return state
  }
}

const initialState: State = {
  status: 'setup',
  mes: 0,
  efectivo: 0,
  activo: 0,
  pasivo: 0,
  gastos: 0,
  activos: [],
  opciones: [],
  aviso: null,
  reflexion: null,
  log: [],
}

// ── Componente ───────────────────────────────────────────────────────

export default function CarreraRata() {
  const [state, dispatch] = useReducer(reducer, initialState)

  if (state.status === 'setup') return <Setup onStart={(seed) => dispatch({ type: 'start', seed })} />

  const flujo = state.activo + state.pasivo - state.gastos
  const libertad = state.gastos > 0 ? Math.min(100, Math.round((state.pasivo / state.gastos) * 100)) : 100

  if (state.status === 'won' || state.status === 'lost') {
    const won = state.status === 'won'
    return (
      <div className={s.big}>
        <div className={s.bigTitle}>{won ? '🎉 ¡Has salido de la rueda!' : '💥 Has quebrado'}</div>
        <div className={s.bigSub}>
          {won
            ? `En el mes ${state.mes}, tu ingreso pasivo (${formatEur(state.pasivo)}) cubre tus gastos (${formatEur(state.gastos)}). Ya no dependes de tu sueldo.`
            : `Te quedaste sin efectivo en el mes ${state.mes} y no pudiste cubrir tus gastos.`}
        </div>
        {won && (
          <p className={s.reflexion} style={{ maxWidth: 460, margin: '0 auto 20px' }}>
            ¿Qué decisión crees que te acercó más a escapar? ¿Y cuál te frenó?
          </p>
        )}
        <button className={s.primary} onClick={() => dispatch({ type: 'reiniciar' })}>
          Jugar otra vez
        </button>
      </div>
    )
  }

  return (
    <div className={s.grid}>
      {/* Hoja financiera */}
      <div className="card">
        <div className="sec-title">Mes {state.mes}</div>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel}>Sueldo (activo)</span>
          <span className={s.sheetValue}>{formatEur(state.activo)}</span>
        </div>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel}>Ingreso pasivo</span>
          <span className={s.sheetValue} style={{ color: 'var(--up)' }}>{formatEur(state.pasivo)}</span>
        </div>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel}>Gastos</span>
          <span className={s.sheetValue} style={{ color: 'var(--down)' }}>{formatEur(state.gastos)}</span>
        </div>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel}>Flujo mensual</span>
          <span className={s.sheetValue} style={{ color: flujo >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {formatEur(flujo)}
          </span>
        </div>
        <div className={s.sheetRow}>
          <span className={s.sheetLabel}>Efectivo</span>
          <span className={s.sheetValue}>{formatEur(state.efectivo)}</span>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--tx2)' }}>
          Libertad: ingreso pasivo vs. gastos
        </div>
        <div className={s.meter}>
          <div className={s.meterFill} style={{ width: `${libertad}%` }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 4 }}>{libertad}%</div>

        <div className={s.log}>
          {state.log.map((l, i) => (
            <div key={i} className={s.logItem}>{l}</div>
          ))}
        </div>
      </div>

      {/* Decisiones */}
      <div>
        {state.aviso && (
          <div className={`${s.aviso} ${state.aviso.bueno ? s.avisoBueno : s.avisoMalo}`}>
            {state.aviso.texto}
          </div>
        )}
        {state.reflexion && <p className={s.reflexion}>{state.reflexion}</p>}

        <div className={s.cards} style={{ marginBottom: 14 }}>
          {state.opciones.map((c, i) => {
            const asequible =
              c.tipo === 'oportunidad' ? state.efectivo >= c.coste : state.efectivo >= c.entrada
            return (
              <div
                key={i}
                className={`${s.card} ${c.tipo === 'oportunidad' ? s.cardOportunidad : s.cardTentacion}`}
              >
                <div className={s.cardTitle}>{c.nombre}</div>
                <div className={s.cardDesc}>{c.desc}</div>
                {c.tipo === 'oportunidad' ? (
                  <div className={s.cardStat}>
                    Coste {formatEur(c.coste)} · <span style={{ color: 'var(--up)' }}>+{formatEur(c.pasivo)}/mes</span>
                  </div>
                ) : (
                  <div className={s.cardStat}>
                    {c.entrada > 0 ? `Entrada ${formatEur(c.entrada)} · ` : ''}
                    <span style={{ color: 'var(--down)' }}>+{formatEur(c.gastoMensual)}/mes gasto</span>
                  </div>
                )}
                <button
                  className={s.cardBtn}
                  disabled={!asequible}
                  onClick={() => dispatch({ type: 'elegir', carta: c })}
                >
                  {asequible ? 'Elegir' : 'No te llega el efectivo'}
                </button>
              </div>
            )
          })}
        </div>

        <button className={s.pass} onClick={() => dispatch({ type: 'pasar' })}>
          Pasar mes (ahorrar)
        </button>
      </div>
    </div>
  )
}

// ── Pantalla de configuración (siembra desde datos reales) ────────────

function Setup({ onStart }: { onStart: (seed: Seed) => void }) {
  const now = new Date()
  const anio = now.getFullYear()
  const mes = now.getMonth() + 1
  const ingresos = useIngresosResumen({ anio, mes })
  const gastosFijos = useGastosFijosMes(anio, mes)
  const cash = useQuery({ queryKey: ['capitalCuentas'], queryFn: financeApi.capitalCuentas })

  const cargando = ingresos.isLoading || gastosFijos.isLoading || cash.isLoading

  const familias = ingresos.data?.familias ?? []
  const activoReal = Math.round(familias.find((f) => f.familia === 'ACTIVO')?.total ?? 0)
  const pasivoReal = Math.round(
    familias
      .filter((f) => f.familia === 'PASIVO' || f.familia === 'INVERSION')
      .reduce((a, f) => a + Number(f.total || 0), 0),
  )
  const gastosReal = Math.round(gastosFijos.data?.total ?? 0)
  const efectivoReal = Math.round(cash.data ?? 0)

  // Valores por defecto sensatos si aún no tienes datos.
  const [activo, setActivo] = useState<string>('')
  const [pasivo, setPasivo] = useState<string>('')
  const [gastos, setGastos] = useState<string>('')
  const [efectivo, setEfectivo] = useState<string>('')

  // Prerellena una sola vez cuando llegan los datos reales.
  const [prefilled, setPrefilled] = useState(false)
  if (!cargando && !prefilled) {
    setActivo(String(activoReal || 2000))
    setPasivo(String(pasivoReal || 0))
    setGastos(String(gastosReal || 1500))
    setEfectivo(String(efectivoReal || 3000))
    setPrefilled(true)
  }

  const n = (v: string) => Math.max(0, Number(v) || 0)

  return (
    <div>
      <div className={s.header}>
        <h1>Carrera de la rata</h1>
        <p>Sal de la rueda: consigue que tu ingreso pasivo cubra tus gastos.</p>
      </div>

      <StatGrid>
        <StatCard label="Objetivo" value="Pasivo ≥ Gastos" />
        <StatCard label="Cada turno" value="1 mes" />
        <StatCard label="Pierdes si" value="te quedas sin efectivo" />
      </StatGrid>

      <div className="card" style={{ maxWidth: 460, marginTop: 16 }}>
        <div className="sec-title">Tu punto de partida</div>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 14 }}>
          Prerellenado con tus números reales de YouFinance. Ajústalo si quieres; el juego no
          modifica tus finanzas.
        </p>
        {cargando ? (
          <p style={{ color: 'var(--tx2)' }}>Cargando tus datos…</p>
        ) : (
          <>
            <div className={s.setupField}>
              <label>Sueldo mensual (ingreso activo)</label>
              <input type="number" value={activo} onChange={(e) => setActivo(e.target.value)} />
            </div>
            <div className={s.setupField}>
              <label>Ingreso pasivo mensual</label>
              <input type="number" value={pasivo} onChange={(e) => setPasivo(e.target.value)} />
            </div>
            <div className={s.setupField}>
              <label>Gastos mensuales</label>
              <input type="number" value={gastos} onChange={(e) => setGastos(e.target.value)} />
            </div>
            <div className={s.setupField}>
              <label>Efectivo inicial</label>
              <input type="number" value={efectivo} onChange={(e) => setEfectivo(e.target.value)} />
            </div>
            <button
              className={s.primary}
              onClick={() =>
                onStart({
                  activo: n(activo),
                  pasivo: n(pasivo),
                  gastos: n(gastos),
                  efectivo: n(efectivo),
                })
              }
            >
              Empezar partida
            </button>
          </>
        )}
      </div>
    </div>
  )
}
