import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, List, UserPlus } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { CampaignStatusBadge } from '../components/campaigns/CampaignStatusBadge'
import { CampaignMetricsCards } from '../components/campaigns/CampaignMetricsCards'
import { CampaignFunnel } from '../components/campaigns/CampaignFunnel'
import { SendsTable } from '../components/campaigns/SendsTable'
import { EnrollmentDialog } from '../components/followup/EnrollmentDialog'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { useCampaign } from '../hooks/useCampaigns'
import { useEmailSends } from '../hooks/useEmailSends'
import { formatDateTimeBR } from '../lib/utils'

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const { data: campaign, isLoading } = useCampaign(id)
  const { data: sends = [], isLoading: loadingSends } = useEmailSends(id)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-muted-foreground">Campanha não encontrada.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/campanhas')}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campanhas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Header
          title={campaign.name}
          actions={
            <div className="flex items-center gap-3">
              <CampaignStatusBadge status={campaign.status} />
              {campaign.sent_at && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDateTimeBR(campaign.sent_at)}
                </span>
              )}
              {campaign.list && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <List className="h-3.5 w-3.5" />
                  {campaign.list.title}
                </span>
              )}
            </div>
          }
        />
      </div>

      <CampaignMetricsCards campaign={campaign} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <CampaignFunnel campaign={campaign} />
        </div>
        <div className="lg:col-span-2 rounded-lg border bg-card p-4 space-y-2">
          <h3 className="text-sm font-medium">Informações da campanha</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Remetente</span>
              <span>{campaign.from_name} &lt;{campaign.from_email}&gt;</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de destinatários</span>
              <span>{campaign.total_recipients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assunto</span>
              <span className="max-w-xs truncate text-right">{campaign.subject}</span>
            </div>
          </div>
        </div>
      </div>

      <SendsTable sends={sends} isLoading={loadingSends} />

      {campaign.status === 'completed' && sends.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Sequência de follow-up</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inscreva os leads desta campanha em uma sequência de acompanhamento
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setEnrollOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Inscrever em sequência
          </Button>
        </div>
      )}

      {id && (
        <EnrollmentDialog
          open={enrollOpen}
          onClose={() => setEnrollOpen(false)}
          campaignId={id}
          sends={sends}
        />
      )}
    </div>
  )
}
