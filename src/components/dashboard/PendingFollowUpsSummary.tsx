import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import type { DashboardData } from '../../hooks/useDashboard'

interface PendingFollowUpsSummaryProps {
  data: DashboardData | undefined
  isLoading: boolean
}

export function PendingFollowUpsSummary({ data, isLoading }: PendingFollowUpsSummaryProps) {
  const navigate = useNavigate()
  const pending = data?.pending_follow_ups ?? 0
  const active = data?.active_enrollments ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Follow-ups Pendentes</CardTitle>
          {!isLoading && pending > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pending} pronto{pending !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${pending > 0 ? 'text-red-400' : 'text-muted-foreground'}`} />
                <span>
                  <span className={`font-semibold ${pending > 0 ? 'text-red-400' : 'text-foreground'}`}>{pending}</span>
                  <span className="text-muted-foreground text-xs ml-1">para enviar</span>
                </span>
              </div>
              <div>
                <span className="font-semibold">{active}</span>
                <span className="text-muted-foreground text-xs ml-1">inscrições ativas</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/follow-ups')}>
              Ir para Follow-ups <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
