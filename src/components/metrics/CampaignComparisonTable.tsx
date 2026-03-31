import { useNavigate } from 'react-router-dom'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { CampaignStatusBadge } from '../campaigns/CampaignStatusBadge'
import { formatDateBR } from '../../lib/utils'
import type { EmailCampaign } from '../../types'

function pct(num: number, den: number) {
  if (!den) return '—'
  return `${Math.round((num / den) * 100)}%`
}

export function CampaignComparisonTable({ campaigns }: { campaigns: EmailCampaign[] }) {
  const navigate = useNavigate()

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Campanha</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Enviados</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Abertura</TableHead>
            <TableHead>Resposta</TableHead>
            <TableHead>Bounce</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                Nenhuma campanha encontrada.
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map(c => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => navigate(`/campanhas/${c.id}`)}
              >
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell><CampaignStatusBadge status={c.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {c.sent_at ? formatDateBR(c.sent_at) : formatDateBR(c.created_at)}
                </TableCell>
                <TableCell>{c.sent_count}</TableCell>
                <TableCell>{pct(c.delivered_count, c.sent_count)}</TableCell>
                <TableCell>{pct(c.opened_count, c.delivered_count)}</TableCell>
                <TableCell>{pct(c.replied_count, c.sent_count)}</TableCell>
                <TableCell>{pct(c.bounced_count, c.total_recipients)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
