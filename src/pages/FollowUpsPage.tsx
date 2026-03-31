import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { Skeleton } from '../components/ui/skeleton'
import { SequenceCard } from '../components/followup/SequenceCard'
import { PendingFollowUpsTable } from '../components/followup/PendingFollowUpsTable'
import { ActivityLog } from '../components/followup/ActivityLog'
import { PollingStatus } from '../components/followup/PollingStatus'
import { useSequences, useDeleteSequence } from '../hooks/useSequences'
import { usePendingFollowUps } from '../hooks/useEnrollments'
import { useActivityLog } from '../hooks/useActivityLog'
import { useQueryClient } from '@tanstack/react-query'

export function FollowUpsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('pendentes')
  const [lastPoll, setLastPoll] = useState<Date | null>(null)

  const { data: sequences = [], isLoading: loadingSeqs } = useSequences()
  const { data: pending = [], isLoading: loadingPending } = usePendingFollowUps()
  // Use first sequence for global activity or null for all sequences
  const firstSeqId = sequences[0]?.id
  const { data: activity = [], isLoading: loadingActivity } = useActivityLog(firstSeqId)

  const { mutateAsync: deleteSequence } = useDeleteSequence()

  const handleDelete = async (id: string) => {
    try {
      await deleteSequence(id)
      toast.success('Sequência excluída')
    } catch {
      toast.error('Erro ao excluir sequência')
    }
  }

  const handlePollComplete = () => {
    setLastPoll(new Date())
    queryClient.invalidateQueries({ queryKey: ['pending-followups'] })
    queryClient.invalidateQueries({ queryKey: ['pending-count'] })
    queryClient.invalidateQueries({ queryKey: ['enrollments'] })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Header
          title="Follow-ups"
          description="Gerencie sequências de acompanhamento e disparos pendentes"
        />
        <Button size="sm" onClick={() => navigate('/follow-ups/sequencias/nova')}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova sequência
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pendentes">
            Pendentes
            {pending.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sequencias">Sequências</TabsTrigger>
          <TabsTrigger value="atividade">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="pendentes">
          <div className="space-y-4">
            <PollingStatus lastPoll={lastPoll} onPollComplete={handlePollComplete} />
            {loadingPending ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (
              <PendingFollowUpsTable
                items={pending}
                onSent={() => {
                  queryClient.invalidateQueries({ queryKey: ['pending-followups'] })
                  queryClient.invalidateQueries({ queryKey: ['pending-count'] })
                }}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="sequencias">
          {loadingSeqs ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
            </div>
          ) : sequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Nenhuma sequência criada</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate('/follow-ups/sequencias/nova')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Criar sequência
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sequences.map(seq => (
                <SequenceCard key={seq.id} sequence={seq} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="atividade">
          <ActivityLog entries={activity} isLoading={loadingActivity} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
