import { Building2, Users, Mail, Send, TrendingUp, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
import type { DashboardData } from '../../hooks/useDashboard'

function pct(num: number, den: number): string {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Building2
  label: string
  value: string | number
  sub?: string
  color: 'muted' | 'emerald' | 'blue' | 'primary' | 'amber' | 'red'
}) {
  const colorMap = {
    muted: 'text-muted-foreground bg-muted',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    primary: 'text-primary bg-primary/10',
    amber: 'text-amber-400 bg-amber-400/10',
    red: 'text-red-400 bg-red-400/10',
  }
  const iconColor = colorMap[color]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-2xl font-bold mt-1 leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PipelineCardsProps {
  data: DashboardData | undefined
  isLoading: boolean
}

export function PipelineCards({ data, isLoading }: PipelineCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const d = data ?? {
    total_companies: 0, qualified_companies: 0, total_enriched_leads: 0,
    total_campaigns: 0, total_sent: 0, total_delivered: 0,
    total_opened: 0, total_replied: 0, total_bounced: 0,
    pending_follow_ups: 0, active_enrollments: 0,
  }

  const qualPct = d.total_companies ? Math.round((d.qualified_companies / d.total_companies) * 100) : 0
  const openRate = d.total_delivered ? Math.round((d.total_opened / d.total_delivered) * 100) : 0
  const replyRate = d.total_sent ? Math.round((d.total_replied / d.total_sent) * 100) : 0
  const bounceRate = d.total_sent ? Math.round((d.total_bounced / d.total_sent) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Linha 1 — Volume */}
      <MetricCard icon={Building2} label="CNPJs Consultados" value={d.total_companies} color="muted" />
      <MetricCard icon={CheckCircle2} label="Qualificadas" value={d.qualified_companies} sub={d.total_companies ? `${qualPct}% do total` : undefined} color="emerald" />
      <MetricCard icon={Users} label="Leads Enriquecidos" value={d.total_enriched_leads} color="blue" />
      <MetricCard icon={Mail} label="Campanhas Enviadas" value={d.total_campaigns} color="primary" />

      {/* Linha 2 — Performance */}
      <MetricCard icon={Send} label="E-mails Entregues" value={d.total_delivered} sub={pct(d.total_delivered, d.total_sent)} color="emerald" />
      <MetricCard
        icon={TrendingUp}
        label="Taxa Abertura"
        value={`${openRate}%`}
        sub={`${d.total_opened} de ${d.total_delivered}`}
        color="blue"
      />
      <MetricCard
        icon={MessageCircle}
        label="Taxa Resposta"
        value={`${replyRate}%`}
        sub={`${d.total_replied} respostas`}
        color={replyRate >= 5 ? 'emerald' : 'amber'}
      />
      <MetricCard
        icon={AlertCircle}
        label="Taxa Bounce"
        value={`${bounceRate}%`}
        sub={`${d.total_bounced} bounces`}
        color={bounceRate <= 2 ? 'emerald' : bounceRate <= 5 ? 'amber' : 'red'}
      />
    </div>
  )
}
