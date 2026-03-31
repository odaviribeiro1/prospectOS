import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { ActivityLog } from './ActivityLog'
import { useLeadTimeline } from '../../hooks/useActivityLog'
import type { EnrichedLead } from '../../types'

interface FollowUpTimelineProps {
  lead: Pick<EnrichedLead, 'id' | 'nome' | 'empresa_nome'> | null
  onClose: () => void
}

export function FollowUpTimeline({ lead, onClose }: FollowUpTimelineProps) {
  const { data: entries = [], isLoading } = useLeadTimeline(lead?.id)

  if (!lead) return null

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-background border-l border-border shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-medium text-sm">{lead.nome}</h3>
          <p className="text-xs text-muted-foreground">{lead.empresa_nome}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Linha do tempo
        </h4>
        <ActivityLog entries={entries} isLoading={isLoading} />
      </div>
    </div>
  )
}
