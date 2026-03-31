import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { TableSkeleton } from '../ui/table-skeleton'
import { EmptyState } from '../ui/empty-state'
import { Mail } from 'lucide-react'
import type { CampaignPerfRow } from '../../hooks/useDashboard'

function pct(num: number, den: number): string {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

function RateCell({ value, num, den }: { value: string; num: number; den: number }) {
  const rate = den ? (num / den) * 100 : 0
  const color = rate >= 20 ? 'text-emerald-400' : rate >= 10 ? 'text-blue-400' : rate >= 5 ? 'text-amber-400' : 'text-muted-foreground'
  return <span className={color}>{value}</span>
}

interface CampaignPerformanceTableProps {
  campaigns: CampaignPerfRow[]
  isLoading: boolean
}

export function CampaignPerformanceTable({ campaigns, isLoading }: CampaignPerformanceTableProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Performance por Campanha</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 pb-4">
            <TableSkeleton rows={4} columns={4} />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="Nenhuma campanha enviada"
            description="Envie sua primeira campanha para ver os dados de performance aqui"
            action={{ label: 'Ver Campanhas', href: '/campanhas' }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Campanha</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Enviados</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden sm:table-cell">Entregues</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Abertura</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {campaigns.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/campanhas/${c.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-xs truncate max-w-[180px]">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-right tabular-nums">{c.sent_count}</td>
                    <td className="px-4 py-3 text-xs text-right tabular-nums hidden sm:table-cell">
                      {pct(c.delivered_count, c.sent_count)}
                    </td>
                    <td className="px-4 py-3 text-xs text-right tabular-nums">
                      <RateCell value={pct(c.opened_count, c.delivered_count)} num={c.opened_count} den={c.delivered_count} />
                    </td>
                    <td className="px-4 py-3 text-xs text-right tabular-nums">
                      <RateCell value={pct(c.replied_count, c.sent_count)} num={c.replied_count} den={c.sent_count} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
