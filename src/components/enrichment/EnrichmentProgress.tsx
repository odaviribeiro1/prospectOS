import { CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Progress } from '../ui/progress'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { useAppStore } from '../../stores/appStore'

interface EnrichmentProgressProps {
  open: boolean
  onClose: () => void
}

export function EnrichmentProgress({ open, onClose }: EnrichmentProgressProps) {
  const navigate = useNavigate()
  const { enrichmentProgress, resetEnrichment } = useAppStore()
  const { total, current, status, result } = enrichmentProgress

  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  const handleViewList = () => {
    if (result?.list_id) {
      resetEnrichment()
      onClose()
      navigate(`/listas/${result.list_id}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && status !== 'processing' && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {status === 'processing' && 'Enriquecendo leads...'}
            {status === 'done' && 'Enriquecimento concluído!'}
            {status === 'error' && 'Erro no enriquecimento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status === 'processing' && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Enriquecendo {current}/{total} sócios via Apollo.io...</span>
              </div>
              <Progress value={pct} />
            </>
          )}

          {status === 'done' && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Lista {result.title} criada com {result.enriched_count} leads enriquecidos
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Total processado: {result.total} sócios</p>
                <p>Enriquecidos: {result.enriched_count}</p>
                {result.errors > 0 && <p className="text-amber-400">Erros: {result.errors}</p>}
              </div>
              <Button onClick={handleViewList} className="w-full">
                <ExternalLink className="h-4 w-4" />
                Ver Lista
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5" />
              <span>Ocorreu um erro. Tente novamente.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
