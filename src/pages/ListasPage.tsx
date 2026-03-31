import { useNavigate } from 'react-router-dom'
import { List, Clock, CheckCircle2, Megaphone, ArrowRight } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { useLeadLists } from '../hooks/useLeadLists'
import { formatDateTimeBR } from '../lib/utils'
import type { LeadList, ListStatus } from '../types'

function StatusBadge({ status }: { status: ListStatus }) {
  if (status === 'pending_review') return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pendente Revisão</Badge>
  if (status === 'reviewed') return <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />Revisada</Badge>
  return <Badge variant="info"><Megaphone className="h-3 w-3 mr-1" />Em Campanha</Badge>
}

function ListCard({ list }: { list: LeadList }) {
  const navigate = useNavigate()
  const isReviewed = list.status !== 'pending_review'

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/listas/${list.id}`)}>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
              <List className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm leading-tight">{list.title}</p>
              <p className="text-xs text-muted-foreground">{formatDateTimeBR(list.created_at)}</p>
            </div>
          </div>
          <StatusBadge status={list.status} />
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total de leads</span>
            <span className="font-medium">{list.total_leads}</span>
          </div>
          {isReviewed && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aprovados</span>
                <span className="text-emerald-400 font-medium">{list.approved_leads}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rejeitados</span>
                <span className="text-red-400 font-medium">{list.rejected_leads}</span>
              </div>
            </>
          )}
        </div>

        <Button variant={list.status === 'pending_review' ? 'default' : 'outline'} size="sm" className="w-full">
          {list.status === 'pending_review' ? 'Revisar' : 'Ver'} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function ListasPage() {
  const { data: lists = [], isLoading } = useLeadLists()

  return (
    <div className="space-y-6">
      <Header
        title="Listas de Leads Enriquecidos"
        description="Revise e aprove leads antes de iniciar campanhas"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <List className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nenhuma lista criada ainda.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione empresas qualificadas em <strong>Empresas</strong> e clique em "Enriquecer".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  )
}
