import type { EmailCampaign } from '../../types'

interface FunnelStepProps {
  label: string
  value: number
  max: number
  opacity: string
}

function FunnelStep({ label, value, max, opacity }: FunnelStepProps) {
  const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-7 rounded-md bg-muted/30 overflow-hidden">
        <div
          className={`h-full rounded-md bg-primary ${opacity} transition-all duration-500`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function CampaignFunnel({ campaign: c }: { campaign: EmailCampaign }) {
  const max = c.total_recipients || 1

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium">Funil de conversão</h3>
      <div className="space-y-2">
        <FunnelStep label="Enviados" value={c.sent_count} max={max} opacity="opacity-100" />
        <FunnelStep label="Entregues" value={c.delivered_count} max={max} opacity="opacity-80" />
        <FunnelStep label="Abertos" value={c.opened_count} max={max} opacity="opacity-60" />
        <FunnelStep label="Respostas" value={c.replied_count} max={max} opacity="opacity-40" />
      </div>
    </div>
  )
}
