import { useState } from 'react'
import { Loader2, Send, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { formatDateTimeBR } from '../../lib/utils'
import type { PendingFollowUp } from '../../types'

interface PendingFollowUpsTableProps {
  items: PendingFollowUp[]
  onSent: () => void
}

export function PendingFollowUpsTable({ items, onSent }: PendingFollowUpsTableProps) {
  const [sending, setSending] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)

  const sendOne = async (enrollmentId: string) => {
    setSending(prev => new Set(prev).add(enrollmentId))
    try {
      const res = await supabase.functions.invoke('follow-up-send', {
        body: { enrollment_id: enrollmentId },
      })
      if (res.error) throw res.error
      if (res.data?.error) throw new Error(res.data.error)
      toast.success('Follow-up enviado!')
      onSent()
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setSending(prev => { const s = new Set(prev); s.delete(enrollmentId); return s })
    }
  }

  const sendAll = async () => {
    setSendingAll(true)
    let sent = 0
    let failed = 0
    for (const item of items) {
      try {
        const res = await supabase.functions.invoke('follow-up-send', {
          body: { enrollment_id: item.enrollment.id },
        })
        if (res.error || res.data?.error) throw new Error(res.data?.error || 'Erro')
        sent++
      } catch {
        failed++
      }
    }
    toast.success(`${sent} enviados${failed > 0 ? `, ${failed} com erro` : ''}`)
    setSendingAll(false)
    onSent()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Clock className="h-8 w-8 mb-3 opacity-40" />
        <p className="text-sm">Nenhum follow-up pendente no momento</p>
        <p className="text-xs mt-1">Os follow-ups vencidos aparecerão aqui</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{items.length} pendente{items.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={sendAll} disabled={sendingAll}>
          {sendingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
          Enviar todos
        </Button>
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Lead</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sequência</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Passo</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Venceu em</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item) => {
              const lead = item.enrollment.lead
              const isSending = sending.has(item.enrollment.id)
              return (
                <tr key={item.enrollment.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-xs">{lead?.nome}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[160px]">{lead?.empresa_nome}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs">{item.sequence.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="info" className="text-[10px]">
                      #{item.enrollment.current_step} {item.step.name}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {item.enrollment.next_step_due_at ? formatDateTimeBR(item.enrollment.next_step_due_at) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isSending || sendingAll}
                      onClick={() => sendOne(item.enrollment.id)}
                    >
                      {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                      Enviar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
