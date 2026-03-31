import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import type { DashboardData } from '../../hooks/useDashboard'

interface FunnelRow {
  label: string
  value: number
  colorClass: string
  bgClass: string
}

interface ProspectionFunnelProps {
  data: DashboardData | undefined
  isLoading: boolean
}

export function ProspectionFunnel({ data, isLoading }: ProspectionFunnelProps) {
  const d = data

  const rows: FunnelRow[] = [
    { label: 'CNPJs Consultados', value: d?.total_companies ?? 0, colorClass: 'bg-muted-foreground/60', bgClass: 'bg-muted' },
    { label: 'Qualificadas', value: d?.qualified_companies ?? 0, colorClass: 'bg-emerald-400', bgClass: 'bg-emerald-400/10' },
    { label: 'Leads Enriquecidos', value: d?.total_enriched_leads ?? 0, colorClass: 'bg-blue-400', bgClass: 'bg-blue-400/10' },
    { label: 'E-mails Enviados', value: d?.total_sent ?? 0, colorClass: 'bg-primary', bgClass: 'bg-primary/10' },
    { label: 'Abertos', value: d?.total_opened ?? 0, colorClass: 'bg-blue-300', bgClass: 'bg-blue-300/10' },
    { label: 'Respondidos', value: d?.total_replied ?? 0, colorClass: 'bg-emerald-300', bgClass: 'bg-emerald-300/10' },
  ]

  const maxValue = Math.max(...rows.map(r => r.value), 1)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Funil de Prospecção</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
        ) : (
          rows.map((row) => {
            const pct = Math.max((row.value / maxValue) * 100, row.value > 0 ? 4 : 0)
            return (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{row.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className={`h-2 rounded-full w-full ${row.bgClass}`}>
                  <div
                    className={`h-2 rounded-full ${row.colorClass} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
