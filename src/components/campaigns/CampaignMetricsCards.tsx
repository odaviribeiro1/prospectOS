import { Send, Inbox, Eye, MessageSquare, AlertTriangle } from 'lucide-react'
import type { EmailCampaign } from '../../types'

function pct(num: number, den: number) {
  if (!den || !num) return 0
  return Math.round((num / den) * 100)
}

function MetricCard({
  icon: Icon,
  label,
  value,
  pctValue,
  thresholds,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  pctValue?: number
  thresholds?: { green: number; yellow: number; red: boolean }
}) {
  let pctColor = 'text-blue-400'
  if (thresholds) {
    if (thresholds.red) {
      pctColor = (pctValue ?? 0) <= thresholds.green ? 'text-emerald-400'
        : (pctValue ?? 0) <= thresholds.yellow ? 'text-amber-400'
        : 'text-red-400'
    } else {
      pctColor = (pctValue ?? 0) >= thresholds.green ? 'text-emerald-400'
        : (pctValue ?? 0) >= thresholds.yellow ? 'text-amber-400'
        : 'text-red-400'
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {pctValue !== undefined && (
          <span className={`text-sm font-medium pb-0.5 ${pctColor}`}>{pctValue}%</span>
        )}
      </div>
    </div>
  )
}

export function CampaignMetricsCards({ campaign: c }: { campaign: EmailCampaign }) {
  const delivPct = pct(c.delivered_count, c.sent_count)
  const openPct = pct(c.opened_count, c.delivered_count)
  const replyPct = pct(c.replied_count, c.sent_count)
  const bouncePct = pct(c.bounced_count, c.total_recipients)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <MetricCard icon={Send} label="Enviados" value={c.sent_count} />
      <MetricCard
        icon={Inbox}
        label="Entregues"
        value={c.delivered_count}
        pctValue={delivPct}
        thresholds={{ green: 95, yellow: 90, red: false }}
      />
      <MetricCard icon={Eye} label="Abertos" value={c.opened_count} pctValue={openPct} />
      <MetricCard icon={MessageSquare} label="Respostas" value={c.replied_count} pctValue={replyPct} />
      <MetricCard
        icon={AlertTriangle}
        label="Bounce"
        value={c.bounced_count}
        pctValue={bouncePct}
        thresholds={{ green: 2, yellow: 5, red: true }}
      />
    </div>
  )
}
