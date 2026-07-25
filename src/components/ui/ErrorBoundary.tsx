import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

/** Captura errores de render de los hijos y muestra un fallback en vez de romper toda la app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx2)' }}>
        <p style={{ marginBottom: 12 }}>Algo ha fallado al mostrar esta vista.</p>
        <button
          type="button"
          onClick={this.reset}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border2)',
            background: 'var(--bg2)',
            color: 'var(--tx1)',
            cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }
}
