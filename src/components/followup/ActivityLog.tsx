import { Mail, UserMinus, CheckCircle2, RefreshCw, SkipForward, UserPlus } from 'lucide-react'
import { formatDateTimeBR } from '../../lib/utils'
import type { FollowUpActivityLogEntry, ActivityType } from '../../types'

const ACTIVITY_ICONS: Record<ActivityType, React.ElementType> = {
  enrollment_created: UserPlus,
  step_sent: Mail,
  step_skipped: SkipForward,
  enrollment_completed: CheckCircle2,
  enrollment_removed: UserMinus,
  chatwoot_poll: RefreshCw,
}

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  enrollment_created: 'text-blue-400 bg-blue-400/10',
  step_sent: 'text-emerald-400 bg-emerald-400/10',
  step_skipped: 'text-amber-400 bg-amber-400/10',
  enrollment_completed: 'text-emerald-400 bg-emerald-400/10',
  enrollment_removed: 'text-red-400 bg-red-400/10',
  chatwoot_poll: 'text-muted-foreground bg-muted',
}

interface ActivityLogProps {
  entries: FollowUpActivityLogEntry[]
  isLoading?: boolean
}

export function ActivityLog({ entries, isLoading }: ActivityLogProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhuma atividade registrada ainda
      </p>
    )
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, index) => {
        const Icon = ACTIVITY_ICONS[entry.type] ?? Mail
        const colorClass = ACTIVITY_COLORS[entry.type] ?? 'text-muted-foreground bg-muted'
        const isLast = index === entries.length - 1

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <p className="text-sm leading-snug">{entry.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDateTimeBR(entry.created_at)}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
