export function WidgetLoading() {
  return <div style={{ color: 'var(--tx3)', fontSize: 12 }}>Cargando…</div>
}

export function WidgetError({ message }: { message?: string }) {
  return (
    <div style={{ color: 'var(--down)', fontSize: 12 }}>
      {message ?? 'No se pudieron cargar los datos.'}
    </div>
  )
}

export function WidgetEmpty({ message }: { message?: string }) {
  return (
    <div style={{ color: 'var(--tx3)', fontSize: 12 }}>
      {message ?? 'Sin datos todavía.'}
    </div>
  )
}
