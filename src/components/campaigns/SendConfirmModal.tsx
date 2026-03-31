import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { renderWithExamples } from '../../lib/resend'
import type { EmailCampaign } from '../../types'

interface SendConfirmModalProps {
  open: boolean
  campaign: EmailCampaign | null
  recipientCount: number
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function SendConfirmModal({ open, campaign, recipientCount, onConfirm, onClose }: SendConfirmModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const handleConfirm = async () => {
    if (!confirmed || !campaign) return
    setIsSending(true)
    try {
      await onConfirm()
    } finally {
      setIsSending(false)
      setConfirmed(false)
    }
  }

  const handleClose = () => {
    if (isSending) return
    setConfirmed(false)
    onClose()
  }

  if (!campaign) return null

  const previewSubject = renderWithExamples(campaign.subject, campaign.whatsapp_link ?? '')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirmar disparo da campanha</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Campanha</span>
              <span className="font-medium">{campaign.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destinatários</span>
              <span className="font-medium text-primary">{recipientCount} leads</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remetente</span>
              <span>{campaign.from_name} &lt;{campaign.from_email}&gt;</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground shrink-0">Assunto</span>
              <span className="truncate text-right">{previewSubject}</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-400/20 bg-amber-400/5">
            <p className="text-xs text-amber-400">
              Esta ação irá enviar e-mails reais para {recipientCount} pessoa{recipientCount !== 1 ? 's' : ''}. O envio não pode ser desfeito.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="confirm-send"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(!!v)}
              disabled={isSending}
            />
            <Label htmlFor="confirm-send" className="text-sm cursor-pointer leading-relaxed">
              Confirmo que revisei a lista e o conteúdo do e-mail e estou pronto para enviar
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!confirmed || isSending}>
            {isSending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
            ) : (
              <><Send className="h-4 w-4" />Confirmar e Enviar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
