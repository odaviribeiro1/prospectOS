import { useNavigate } from 'react-router-dom'
import { Edit2, Trash2, Users, CheckCircle2, PlayCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import type { FollowUpSequence } from '../../types'

interface SequenceCardProps {
  sequence: FollowUpSequence
  onDelete: (id: string) => void
}

export function SequenceCard({ sequence, onDelete }: SequenceCardProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium text-sm truncate">{sequence.name}</h3>
              <Badge variant={sequence.is_active ? 'success' : 'secondary'} className="text-[10px]">
                {sequence.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </div>
            {sequence.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{sequence.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/follow-ups/sequencias/${sequence.id}/editar`)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => onDelete(sequence.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <PlayCircle className="h-3 w-3" />
            {sequence.steps?.length ?? 0} passos
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {sequence.active_enrollments} ativos
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {sequence.completed_enrollments} concluídos
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full h-7 text-xs"
          onClick={() => navigate(`/follow-ups/sequencias/${sequence.id}`)}
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  )
}
