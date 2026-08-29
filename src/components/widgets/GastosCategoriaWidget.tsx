import { Fragment, useState } from 'react'
import { useGastosCategoria } from '@/hooks/useFinance'
import { PALETTE } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { DonutChart } from '@/components/ui/DonutChart'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function GastosCategoriaWidget() {
  // Offset en meses respecto al mes actual (0 = este mes), igual que en gastos fijos.
  const [offset, setOffset] = useState(0)

  const now = new Date()
  const sel = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const anio = sel.getFullYear()
  const mes = sel.getMonth() + 1
  // Agregado por categoría del mes, calculado en el backend (ya viene ordenado desc).
  const { data, isLoading, isError } = useGastosCategoria({ anio, mes })

  const navBtn: React.CSSProperties = {
    background: 'var(--bg3)',
    color: 'var(--tx1)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    width: 24,
    height: 24,
    lineHeight: '22px',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0,
  }

  // La cabecera se pinta siempre: si no, no habría forma de salir de un mes vacío.
  const header = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        flexShrink: 0,
      }}
    >
      <button type="button" style={navBtn} onClick={() => setOffset((o) => o - 1)}
        aria-label="Mes anterior">‹</button>
      <span style={{ fontWeight: 600, fontSize: 13 }}>
        {MESES[mes - 1]} {anio}
        {offset === 0 && <span style={{ color: 'var(--tx2)', fontWeight: 400 }}> · actual</span>}
      </span>
      <button type="button" style={navBtn} onClick={() => setOffset((o) => o + 1)}
        aria-label="Mes siguiente">›</button>
    </div>
  )

  const total = sum((data ?? []).map((d) => Number(d.total || 0)))
  const items = (data ?? []).map((d, idx) => ({
    name: d.categoria ?? 'Otros',
    amount: Number(d.total || 0),
    pct: total ? Math.round((Number(d.total || 0) / total) * 100) : 0,
    // Color elegido en la categoría; las que aún no tienen uno caen en la paleta.
    color: d.color ?? PALETTE[idx % PALETTE.length],
  }))

  const cell: React.CSSProperties = { padding: '4px 0', whiteSpace: 'nowrap' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {header}

      {isLoading ? (
        <WidgetLoading />
      ) : isError ? (
        <WidgetError />
      ) : items.length === 0 ? (
        <WidgetEmpty message="Sin gastos este mes." />
      ) : (
        // Rosco a la izquierda y desglose a la derecha; en anchos pequeños el
        // desglose baja debajo en vez de estrujar el gráfico.
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          {/*
            El rosco no crece: se dibuja como círculo centrado, así que ensanchar
            su caja solo añadiría aire muerto entre el gráfico y la leyenda.
          */}
          <div style={{ flex: '0 1 170px', minWidth: 140, height: '100%', minHeight: 150 }}>
            <DonutChart
              legend={false}
              labels={items.map((i) => i.name)}
              values={items.map((i) => i.amount)}
              colors={items.map((i) => i.color)}
              tooltipLabel={(c) => {
                const pct = total ? Math.round((Number(c.parsed) / total) * 100) : 0
                return ` ${c.label}: ${formatEur(Number(c.parsed))} · ${pct}%`
              }}
            />
          </div>
          {/*
            Rejilla en vez de una fila flex por categoría: las columnas se ajustan
            al contenido más ancho (y no al ancho del widget), así el nombre queda
            pegado a su importe. `width: fit-content` deja el espacio sobrante para
            el rosco en vez de repartirlo entre columnas.
          */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) max-content max-content',
              alignItems: 'center',
              columnGap: 16,
              width: 'fit-content',
              maxWidth: '100%',
              maxHeight: '100%',
              overflow: 'auto',
              paddingRight: 6,
              fontSize: 12,
            }}
          >
            {items.map((i) => (
              <Fragment key={i.name}>
                <span
                  style={{ ...cell, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}
                  title={i.name}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: i.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      color: 'var(--tx1)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {i.name}
                  </span>
                </span>
                <span style={{ ...cell, fontWeight: 600, color: 'var(--tx1)', textAlign: 'right' }}>
                  {formatEur(i.amount)}
                </span>
                <span style={{ ...cell, color: 'var(--tx2)', textAlign: 'right', width: 30 }}>
                  {i.pct}%
                </span>
              </Fragment>
            ))}
            <div
              style={{
                ...cell,
                gridColumn: '1 / -1',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                borderTop: '1px solid var(--border)',
                paddingTop: 8,
                marginTop: 4,
                fontWeight: 700,
                color: 'var(--tx1)',
              }}
            >
              <span>Total</span>
              {/* El hueco de la derecha alinea el importe con su columna (30 + gap). */}
              <span style={{ paddingRight: 46 }}>{formatEur(total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
