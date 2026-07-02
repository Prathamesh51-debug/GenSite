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
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center text-white">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-gray-400">
          An unexpected error occurred. Reloading usually fixes it.
        </p>
        <button
          onClick={() => { this.setState({ hasError: false }); window.location.assign('/') }}
          className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 px-5 py-2.5 font-medium text-white transition active:scale-95 hover:shadow-lg hover:shadow-indigo-500/40"
        >
          Back to home
        </button>
      </div>
    )
  }
}

export default ErrorBoundary
