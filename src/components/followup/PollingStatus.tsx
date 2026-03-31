import { useState } from 'react'
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { formatDateTimeBR } from '../../lib/utils'

interface PollingStatusProps {
  lastPoll: Date | null
  onPollComplete: () => void
}

export function PollingStatus({ lastPoll, onPollComplete }: PollingStatusProps) {
  const [isPolling, setIsPolling] = useState(false)

  const handleManualPoll = async () => {
    setIsPolling(true)
    try {
      const res = await supabase.functions.invoke('chatwoot-poll')
      if (res.error) throw res.error
      const { total_removed } = res.data as { total_removed: number }
      toast.success(total_removed > 0
        ? `Polling concluído: ${total_removed} lead(s) removido(s) da sequência`
        : 'Polling concluído: nenhuma resposta negativa detectada'
      )
      onPollComplete()
    } catch (err) {
      toast.error(`Erro no polling: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setIsPolling(false)
    }
  }

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/30">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
      <div className="flex-1">
        <span className="font-medium text-foreground">Chatwoot Polling</span>
        {lastPoll && (
          <span className="ml-2">· Última verificação: {formatDateTimeBR(lastPoll.toISOString())}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={handleManualPoll}
        disabled={isPolling}
      >
        {isPolling ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        <span className="ml-1">Verificar agora</span>
      </Button>
    </div>
  )
}
