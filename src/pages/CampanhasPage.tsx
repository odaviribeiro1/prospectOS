import { useNavigate } from 'react-router-dom'
import { Plus, Mail } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { CampaignCard } from '../components/campaigns/CampaignCard'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { useCampaigns } from '../hooks/useCampaigns'

export function CampanhasPage() {
  const navigate = useNavigate()
  const { data: campaigns = [], isLoading } = useCampaigns()

  return (
    <div className="space-y-6">
      <Header
        title="Campanhas de E-mail"
        description="Gerencie e dispare campanhas outbound manualmente"
        actions={
          <Button onClick={() => navigate('/campanhas/nova')}>
            <Plus className="h-4 w-4" /> Nova Campanha
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Mail className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">Nenhuma campanha criada ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Crie sua primeira campanha para começar o outreach.
          </p>
          <Button className="mt-4" onClick={() => navigate('/campanhas/nova')}>
            <Plus className="h-4 w-4" /> Criar campanha
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}
    </div>
  )
}
