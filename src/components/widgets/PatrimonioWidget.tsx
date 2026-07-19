import { Doughnut } from 'react-chartjs-2'
import { useCuentas, useDeudas, useInversiones } from '@/hooks/useFinance'
import { useTheme } from '@/context/ThemeContext'
import { PALETTE, chartTheme } from '@/lib/chartSetup'
import { formatEur } from '@/lib/format'
import { WidgetEmpty, WidgetError, WidgetLoading } from './WidgetState'

const sum = (arr: number[]) => arr.reduce((a, b) => a + Number(b || 0), 0)

export default function PatrimonioWidget() {
  const { theme } = useTheme()
  const cuentas = useCuentas()
  const inversiones = useInversiones()
  const deudas = useDeudas()

  if (cuentas.isLoading || inversiones.isLoading || deudas.isLoading)
    return <WidgetLoading />
  if (cuentas.isError || inversiones.isError || deudas.isError) return <WidgetError />

  const totalCuentas = sum((cuentas.data ?? []).map((c) => c.importe))
  const totalInv = sum((inversiones.data ?? []).map((i) => i.capitalTotal))
  const totalDeuda = sum((deudas.data ?? []).map((d) => d.cantidadPendiente))

  if (totalCuentas + totalInv + totalDeuda === 0) return <WidgetEmpty />

  const t = chartTheme()
  const data = {
    labels: ['Cuentas', 'Inversiones', 'Deuda'],
    datasets: [
      {
        data: [totalCuentas, totalInv, totalDeuda],
        backgroundColor: [PALETTE[0], PALETTE[1], '#f85149'],
        borderColor: t.border,
        borderWidth: 2,
      },
    ],
  }

  return (
    <div style={{ height: '100%', minHeight: 160 }}>
      <Doughnut
        key={theme}
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: '62%',
          plugins: {
            legend: { position: 'bottom', labels: { color: t.tick, boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (c) => ` ${c.label}: ${formatEur(c.parsed)}`,
              },
            },
          },
        }}
      />
    </div>
  )
}
