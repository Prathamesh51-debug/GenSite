import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

// Catches render-time errors in any route/page so a single component failure shows
// a recoverable fallback instead of white-screening the entire app.
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center text-foreground">
        <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. Reloading usually fixes it.
        </p>
        <button
          onClick={() => { this.setState({ hasError: false }); window.location.assign('/') }}
          className="rounded-organic-sm bg-primary px-5 py-2.5 font-semibold text-primary-foreground shadow-sticker-strong tilt-right transition active:scale-95 hover:brightness-105"
        >
          Back to home
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
