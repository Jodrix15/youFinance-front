export default function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '1.5rem 0' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{title}</h1>
      <p style={{ color: 'var(--tx2)' }}>
        Esta sección se portará en la siguiente iteración.
      </p>
    </div>
  )
}
