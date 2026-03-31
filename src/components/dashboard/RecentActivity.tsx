import { useNavigate } from 'react-router-dom'
import { Mail, UserMinus, CheckCircle2, RefreshCw, UserPlus, SkipForward, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import type { RecentActivityEntry } from '../../hooks/useDashboard'

const TYPE_ICONS: Record<string, React.ElementType> = {
  enrollment_created: UserPlus,
  step_sent: Mail,
  step_skipped: SkipForward,
  enrollment_completed: CheckCircle2,
  enrollment_removed: UserMinus,
  chatwoot_poll: RefreshCw,
}

const TYPE_COLORS: Record<string, string> = {
  enrollment_created: 'text-blue-400',
  step_sent: 'text-emerald-400',
  step_skipped: 'text-amber-400',
  enrollment_completed: 'text-emerald-400',
  enrollment_removed: 'text-red-400',
  chatwoot_poll: 'text-muted-foreground',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

interface RecentActivityProps {
  entries: RecentActivityEntry[]
  isLoading: boolean
}

export function RecentActivity({ entries, isLoading }: RecentActivityProps) {
  const navigate = useNavigate()

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2 items-start">
                <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Activity className="h-7 w-7 mb-2 opacity-40" />
            <p className="text-xs">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map((entry) => {
              const Icon = TYPE_ICONS[entry.type] ?? Activity
              const color = TYPE_COLORS[entry.type] ?? 'text-muted-foreground'
              return (
                <div key={entry.id} className="flex gap-2 items-start">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug line-clamp-2">{entry.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(entry.created_at)}</p>
                  </div>
                </div>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs mt-1"
              onClick={() => navigate('/follow-ups')}
            >
              Ver tudo →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
