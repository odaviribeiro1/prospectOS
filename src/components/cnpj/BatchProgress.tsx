import { Progress } from '../ui/progress'
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Batch } from '../../types'

interface BatchProgressProps {
  batch: Batch
}

export function BatchProgress({ batch }: BatchProgressProps) {
  const pct = batch.total > 0 ? Math.round((batch.processed / batch.total) * 100) : 0
  const remaining = batch.total - batch.processed
  const secsRemaining = remaining * 0.5

  return (
    <div className="space-y-3 p-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {batch.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {batch.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {batch.status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
          <span className="font-medium">
            {batch.status === 'processing' && `Processando CNPJ ${batch.processed + 1}/${batch.total}...`}
            {batch.status === 'completed' && 'Consulta concluída!'}
            {batch.status === 'error' && 'Erro no processamento'}
            {batch.status === 'pending' && 'Iniciando...'}
          </span>
        </div>
        <span className="text-muted-foreground">{pct}%</span>
      </div>

      <Progress value={pct} className="h-2" />

      {batch.status === 'processing' && remaining > 0 && (
        <p className="text-xs text-muted-foreground">
          ⏱ ~{secsRemaining < 60 ? `${secsRemaining}s` : `${Math.ceil(secsRemaining / 60)}min`} restantes
        </p>
      )}

      {batch.status === 'completed' && (
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-400">{batch.qualified} qualificadas</span>
          <span className="text-muted-foreground">{batch.disqualified} descartadas</span>
          {batch.errors > 0 && <span className="text-red-400">{batch.errors} erros</span>}
        </div>
      )}
    </div>
  )
}
