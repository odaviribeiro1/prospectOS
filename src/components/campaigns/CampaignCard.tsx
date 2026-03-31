import { useNavigate } from 'react-router-dom'
import { Mail, Trash2, Edit2, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { CampaignStatusBadge } from './CampaignStatusBadge'
import { useDeleteCampaign } from '../../hooks/useCampaigns'
import { formatDateTimeBR } from '../../lib/utils'
import type { EmailCampaign } from '../../types'

function pct(num: number, den: number) {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

interface CampaignCardProps {
  campaign: EmailCampaign
}

export function CampaignCard({ campaign: c }: CampaignCardProps) {
  const navigate = useNavigate()
  const { mutateAsync: deleteCampaign, isPending: isDeleting } = useDeleteCampaign()

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Excluir esta campanha permanentemente?')) return
    try {
      await deleteCampaign(c.id)
      toast.success('Campanha excluída.')
    } catch {
      toast.error('Erro ao excluir campanha.')
    }
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground">{formatDateTimeBR(c.sent_at ?? c.created_at)}</p>
            </div>
          </div>
          <CampaignStatusBadge status={c.status} />
        </div>

        {c.list && (
          <p className="text-xs text-muted-foreground truncate">{c.list.title}</p>
        )}

        {c.status !== 'draft' && c.total_recipients > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enviados</span>
              <span>{c.sent_count}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregues</span>
              <span>{pct(c.delivered_count, c.sent_count)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Abertos</span>
              <span>{pct(c.opened_count, c.delivered_count)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Respostas</span>
              <span>{pct(c.replied_count, c.sent_count)}</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {c.status === 'draft' && (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/campanhas/${c.id}/editar`)}>
                <Edit2 className="h-3.5 w-3.5" /> Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
              </Button>
            </>
          )}
          {c.status !== 'draft' && (
            <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/campanhas/${c.id}`)}>
              {c.status === 'sending' ? 'Ver Progresso' : 'Ver Detalhes'} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
