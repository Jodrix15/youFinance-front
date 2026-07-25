import { useDistribucionPatrimonio } from '@/hooks/useFinance'
import { PALETTE } from '@/lib/chartSetup'
import { formatEur, formatPct } from '@/lib/format'
import { DonutChart } from '@/components/ui/DonutChart'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

export default function PatrimonioWidget() {
  const { data, isLoading, isError } = useDistribucionPatrimonio()

  if (isLoading) return <WidgetLoading />
  if (isError) return <WidgetError />

  const items = (data ?? []).filter((d) => Number(d.importe || 0) > 0)
  if (items.length === 0) return <WidgetEmpty />

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <DonutChart
        labels={items.map((d) => d.concepto)}
        values={items.map((d) => Number(d.importe || 0))}
        colors={items.map((_, idx) => PALETTE[idx % PALETTE.length])}
        tooltipLabel={(c) =>
          ` ${c.label}: ${formatEur(Number(c.parsed))} · ${formatPct(items[c.dataIndex]?.porcentaje ?? null)}`
        }
      />
    </div>
  )
}
