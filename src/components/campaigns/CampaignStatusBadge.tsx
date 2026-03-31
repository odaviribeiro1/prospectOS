import { Badge } from '../ui/badge'
import type { CampaignStatus } from '../../types'

const STATUS_CONFIG: Record<CampaignStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'secondary' }> = {
  draft: { label: 'Rascunho', variant: 'warning' },
  sending: { label: 'Enviando...', variant: 'info' },
  completed: { label: 'Concluída', variant: 'success' },
  paused: { label: 'Pausada', variant: 'secondary' },
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const { label, variant } = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <Badge variant={variant} className={status === 'sending' ? 'animate-pulse' : ''}>
      {label}
    </Badge>
  )
}
