import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit2, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { ActivityLog } from '../components/followup/ActivityLog'
import { FollowUpTimeline } from '../components/followup/FollowUpTimeline'
import { conditionLabel, formatDelay } from '../lib/followup'
import { useSequence } from '../hooks/useSequences'
import { useEnrollments, useRemoveEnrollment } from '../hooks/useEnrollments'
import { useActivityLog } from '../hooks/useActivityLog'
import type { EnrichedLead } from '../types'

export function SequenciaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('inscritos')
  const [timelineLead, setTimelineLead] = useState<Pick<EnrichedLead, 'id' | 'nome' | 'empresa_nome'> | null>(null)

  const { data: sequence, isLoading } = useSequence(id)
  const { data: enrollments = [] } = useEnrollments(id)
  const { data: activity = [], isLoading: loadingActivity } = useActivityLog(id)
  const { mutateAsync: removeEnrollment } = useRemoveEnrollment()

  const handleRemove = async (enrollmentId: string, leadName: string) => {
    try {
      await removeEnrollment({ enrollmentId, reason: 'manual' })
      toast.success(`${leadName} removido da sequência`)
    } catch {
      toast.error('Erro ao remover lead')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!sequence) return null

  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const completedEnrollments = enrollments.filter(e => e.status === 'completed')
  const removedEnrollments = enrollments.filter(e => e.status === 'removed')

  return (
    <div className="space-y-6">
      {timelineLead && (
        <FollowUpTimeline lead={timelineLead} onClose={() => setTimelineLead(null)} />
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/follow-ups')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Header
            title={sequence.name}
            description={sequence.description ?? `${sequence.steps?.length ?? 0} passos · ${activeEnrollments.length} inscritos ativos`}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/follow-ups/sequencias/${id}/editar`)}>
          <Edit2 className="h-3.5 w-3.5 mr-1.5" />
          Editar
        </Button>
      </div>

      {/* Steps overview */}
      {sequence.steps && sequence.steps.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sequence.steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 shrink-0">
              {i > 0 && <span className="text-xs text-muted-foreground">→ {formatDelay(step)}</span>}
              <div className="border border-border rounded-lg px-3 py-2 bg-card min-w-[140px]">
                <div className="text-xs font-medium">{step.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{conditionLabel(step.condition)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="inscritos">Inscritos ({activeEnrollments.length})</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos ({completedEnrollments.length})</TabsTrigger>
          <TabsTrigger value="removidos">Removidos ({removedEnrollments.length})</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="inscritos">
          <EnrollmentTable
            enrollments={activeEnrollments}
            onTimeline={(lead) => setTimelineLead(lead)}
            onRemove={handleRemove}
            showRemove
          />
        </TabsContent>

        <TabsContent value="concluidos">
          <EnrollmentTable
            enrollments={completedEnrollments}
            onTimeline={(lead) => setTimelineLead(lead)}
          />
        </TabsContent>

        <TabsContent value="removidos">
          <EnrollmentTable
            enrollments={removedEnrollments}
            onTimeline={(lead) => setTimelineLead(lead)}
            showRemovalReason
          />
        </TabsContent>

        <TabsContent value="atividade">
          <ActivityLog entries={activity} isLoading={loadingActivity} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

import type { FollowUpEnrollment } from '../types'
import { formatDateTimeBR } from '../lib/utils'

interface EnrollmentTableProps {
  enrollments: FollowUpEnrollment[]
  onTimeline: (lead: Pick<EnrichedLead, 'id' | 'nome' | 'empresa_nome'>) => void
  onRemove?: (id: string, name: string) => void
  showRemove?: boolean
  showRemovalReason?: boolean
}

function EnrollmentTable({ enrollments, onTimeline, onRemove, showRemove, showRemovalReason }: EnrollmentTableProps) {
  if (enrollments.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado</p>
  }

  return (
    <div className="rounded-md border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Lead</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Passo atual</th>
            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
              {showRemovalReason ? 'Motivo da remoção' : 'Próximo envio'}
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {enrollments.map(e => {
            const lead = e.lead
            return (
              <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-xs">{lead?.nome}</div>
                  <div className="text-xs text-muted-foreground">{lead?.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="info" className="text-[10px]">#{e.current_step}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {showRemovalReason
                    ? (e.removal_reason === 'chatwoot_resposta_negativa' ? 'Resposta negativa (Chatwoot)' : e.removal_reason ?? '—')
                    : (e.next_step_due_at ? formatDateTimeBR(e.next_step_due_at) : '—')
                  }
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => lead && onTimeline({ id: lead.id, nome: lead.nome, empresa_nome: lead.empresa_nome })}
                    >
                      Timeline
                    </Button>
                    {showRemove && onRemove && lead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-red-400 hover:text-red-300"
                        onClick={() => onRemove(e.id, lead.nome)}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
