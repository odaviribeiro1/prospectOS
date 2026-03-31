import { Megaphone, Send, Inbox, Eye, MessageSquare } from 'lucide-react'

interface GlobalMetrics {
  totalCampaigns: number
  totalSent: number
  avgDelivery: number
  avgOpen: number
  avgReply: number
}

function MetricCard({ icon: Icon, label, value, suffix = '' }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-4">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}{suffix}</p>
      </div>
    </div>
  )
}

export function GlobalMetricsCards({ metrics }: { metrics: GlobalMetrics }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <MetricCard icon={Megaphone} label="Campanhas enviadas" value={metrics.totalCampaigns} />
      <MetricCard icon={Send} label="E-mails enviados" value={metrics.totalSent} />
      <MetricCard icon={Inbox} label="Taxa média de entrega" value={metrics.avgDelivery} suffix="%" />
      <MetricCard icon={Eye} label="Taxa média de abertura" value={metrics.avgOpen} suffix="%" />
      <MetricCard icon={MessageSquare} label="Taxa média de resposta" value={metrics.avgReply} suffix="%" />
    </div>
  )
}
