import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { EmptyState } from '../components/ui/empty-state'
import { PipelineCards } from '../components/dashboard/PipelineCards'
import { ProspectionFunnel } from '../components/dashboard/ProspectionFunnel'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { PendingFollowUpsSummary } from '../components/dashboard/PendingFollowUpsSummary'
import { CampaignPerformanceTable } from '../components/dashboard/CampaignPerformanceTable'
import { useDashboard, useRecentDashboardActivity, useCampaignPerformance, type DashboardPeriod } from '../hooks/useDashboard'

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  'all': 'Todo o período',
}

export function MetricasPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d')

  const { data: dashData, isLoading } = useDashboard(period)
  const { data: activity = [], isLoading: activityLoading } = useRecentDashboardActivity()
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaignPerformance(period)

  const isEmpty = !isLoading && (dashData?.total_companies ?? 0) === 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Header
          title="Dashboard"
          description="Visão consolidada do seu pipeline de prospecção"
        />
        <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as DashboardPeriod[]).map(p => (
              <SelectItem key={p} value={p} className="text-xs">{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados ainda"
          description="Comece consultando CNPJs para ver seu pipeline de prospecção aqui"
          action={{ label: 'Consultar CNPJs →', href: '/consulta' }}
        />
      ) : (
        <>
          <PipelineCards data={dashData} isLoading={isLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ProspectionFunnel data={dashData} isLoading={isLoading} />
            <RecentActivity entries={activity} isLoading={activityLoading} />
          </div>

          <PendingFollowUpsSummary data={dashData} isLoading={isLoading} />

          <CampaignPerformanceTable campaigns={campaigns} isLoading={campaignsLoading} />
        </>
      )}
    </div>
  )
}
