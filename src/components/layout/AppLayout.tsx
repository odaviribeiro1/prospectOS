import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileSidebar } from './MobileSidebar'
import { ErrorBoundary } from '../ui/error-boundary'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Skeleton } from '../ui/skeleton'

export function AppLayout() {
  const [session, setSession] = useState<'loading' | 'authed' | 'unauthed'>('loading')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? 'authed' : 'unauthed')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ? 'authed' : 'unauthed')
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="space-y-2 w-48">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (session === 'unauthed') return <Navigate to="/login" replace />

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex md:hidden items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          <MobileSidebar />
          <span className="font-semibold text-sm text-foreground">Agentise Leads</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
