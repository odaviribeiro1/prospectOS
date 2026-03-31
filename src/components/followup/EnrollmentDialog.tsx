import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { useSequences } from '../../hooks/useSequences'
import { useEnrollLeads } from '../../hooks/useEnrollments'
import type { EmailSend } from '../../types'

interface EnrollmentDialogProps {
  open: boolean
  onClose: () => void
  campaignId: string
  sends: EmailSend[]
}

export function EnrollmentDialog({ open, onClose, campaignId, sends }: EnrollmentDialogProps) {
  const [sequenceId, setSequenceId] = useState('')
  const { data: sequences = [] } = useSequences()
  const { mutateAsync: enroll, isPending } = useEnrollLeads()

  const activeSequences = sequences.filter(s => s.is_active)

  const handleEnroll = async () => {
    if (!sequenceId) return
    const leadIds = sends
      .filter(s => s.lead_id)
      .map(s => s.lead_id)

    if (leadIds.length === 0) {
      toast.error('Nenhum lead disponível para inscrição')
      return
    }

    try {
      await enroll({ sequenceId, leadIds, campaignId })
      toast.success(`${leadIds.length} leads inscritos na sequência`)
      onClose()
    } catch (err) {
      toast.error(`Erro ao inscrever leads: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inscrever leads em sequência</DialogTitle>
          <DialogDescription>
            Selecione a sequência de follow-up. Os {sends.length} leads desta campanha serão inscritos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Sequência</Label>
            <Select value={sequenceId} onValueChange={setSequenceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma sequência..." />
              </SelectTrigger>
              <SelectContent>
                {activeSequences.length === 0 ? (
                  <SelectItem value="_none" disabled>Nenhuma sequência ativa</SelectItem>
                ) : (
                  activeSequences.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.steps?.length ?? 0} passos
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleEnroll} disabled={!sequenceId || isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Inscrever leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
