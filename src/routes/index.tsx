import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { Skeleton } from '../components/ui/skeleton'

// Public pages — small, load immediately
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { NotFoundPage } from '../pages/NotFoundPage'

// Lazy-loaded app pages
const MetricasPage = lazy(() => import('../pages/MetricasPage').then(m => ({ default: m.MetricasPage })))
const ConsultaPage = lazy(() => import('../pages/ConsultaPage').then(m => ({ default: m.ConsultaPage })))
const EmpresasPage = lazy(() => import('../pages/EmpresasPage').then(m => ({ default: m.EmpresasPage })))
const ListasPage = lazy(() => import('../pages/ListasPage').then(m => ({ default: m.ListasPage })))
const LeadReviewPage = lazy(() => import('../pages/LeadReviewPage').then(m => ({ default: m.LeadReviewPage })))
const CampanhasPage = lazy(() => import('../pages/CampanhasPage').then(m => ({ default: m.CampanhasPage })))
const CampaignCreatePage = lazy(() => import('../pages/CampaignCreatePage').then(m => ({ default: m.CampaignCreatePage })))
const CampaignDetailPage = lazy(() => import('../pages/CampaignDetailPage').then(m => ({ default: m.CampaignDetailPage })))
const FollowUpsPage = lazy(() => import('../pages/FollowUpsPage').then(m => ({ default: m.FollowUpsPage })))
const NovaSequenciaPage = lazy(() => import('../pages/NovaSequenciaPage').then(m => ({ default: m.NovaSequenciaPage })))
const SequenciaDetalhePage = lazy(() => import('../pages/SequenciaDetalhePage').then(m => ({ default: m.SequenciaDetalhePage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then(m => ({ default: m.ProfilePage })))

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function LazyRoute({ element }: { element: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/metricas" replace /> },
      { path: 'metricas', element: <LazyRoute element={<MetricasPage />} /> },
      { path: 'consulta', element: <LazyRoute element={<ConsultaPage />} /> },
      { path: 'empresas', element: <LazyRoute element={<EmpresasPage />} /> },
      { path: 'listas', element: <LazyRoute element={<ListasPage />} /> },
      { path: 'listas/:id', element: <LazyRoute element={<LeadReviewPage />} /> },
      { path: 'campanhas', element: <LazyRoute element={<CampanhasPage />} /> },
      { path: 'campanhas/nova', element: <LazyRoute element={<CampaignCreatePage />} /> },
      { path: 'campanhas/:id', element: <LazyRoute element={<CampaignDetailPage />} /> },
      { path: 'campanhas/:id/editar', element: <LazyRoute element={<CampaignCreatePage />} /> },
      { path: 'follow-ups', element: <LazyRoute element={<FollowUpsPage />} /> },
      { path: 'follow-ups/sequencias/nova', element: <LazyRoute element={<NovaSequenciaPage />} /> },
      { path: 'follow-ups/sequencias/:id', element: <LazyRoute element={<SequenciaDetalhePage />} /> },
      { path: 'follow-ups/sequencias/:id/editar', element: <LazyRoute element={<NovaSequenciaPage />} /> },
      { path: 'perfil', element: <LazyRoute element={<ProfilePage />} /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
