import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Shown in the fallback so a section-level boundary reads as "Analytics failed", not a generic message. */
  label?: string
  /** Section-level boundaries render a small inline card instead of taking over the screen. */
  fullScreen?: boolean
}

interface ErrorBoundaryState {
  error: Error | null
}

// No hook equivalent exists for this — React only recognizes error boundaries
// via getDerivedStateFromError/componentDidCatch on a class component.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.label ? ` — ${this.props.label}` : ''}]`, error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    const reset = () => this.setState({ error: null })

    if (!this.props.fullScreen) {
      return (
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink">{this.props.label ? `${this.props.label} couldn't load` : 'This section hit a problem'}</p>
          <p className="text-xs text-ink-faint mt-1 mb-4">The rest of the page is unaffected — try again, or come back later.</p>
          <Button size="sm" variant="outline" onClick={reset}><RefreshCw className="w-3.5 h-3.5" />Try again</Button>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl border border-app shadow-sm p-8 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-ink mb-1.5">Something went wrong</h1>
          <p className="text-sm text-ink-faint mb-6">This page hit an unexpected error. Reloading usually fixes it.</p>
          <Button onClick={() => window.location.reload()}><RefreshCw className="w-4 h-4" />Reload</Button>
        </div>
      </div>
    )
  }
}
