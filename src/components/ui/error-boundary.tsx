import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './button'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: (error: Error, reset: () => void) => React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 px-4 text-center">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-lg mb-1">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              {this.state.error.message || 'Ocorreu um erro inesperado. Tente novamente.'}
            </p>
          </div>
          <Button onClick={this.reset}>Tentar novamente</Button>
        </div>
      )
    }

    return this.props.children
  }
}
