import { Mail, Link, Phone, Building2, User, ExternalLink } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { ScrollArea } from '../ui/scroll-area'
import { LEAD_STATUS_LABELS } from '../../lib/utils'
import type { EnrichedLead } from '../../types'

interface LeadDetailDrawerProps {
  lead: EnrichedLead | null
  open: boolean
  onClose: () => void
}

export function LeadDetailDrawer({ lead, open, onClose }: LeadDetailDrawerProps) {
  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            {lead.nome}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{lead.cargo ?? 'Cargo não informado'}</Badge>
              <Badge variant={lead.status === 'approved' ? 'success' : lead.status === 'rejected' ? 'error' : 'warning'}>
                {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato</p>
              <div className="space-y-2 text-sm">
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.email}</span>
                    {lead.email_status && (
                      <Badge variant={lead.email_status === 'verified' ? 'success' : 'warning'} className="text-[10px]">
                        {lead.email_status}
                      </Badge>
                    )}
                  </div>
                )}
                {lead.linkedin_url && (
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {lead.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{lead.telefone}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empresa</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.empresa_nome ?? lead.company?.razao_social ?? '-'}</span>
                </div>
                {lead.empresa_domain && (
                  <p className="text-xs text-muted-foreground pl-6">{lead.empresa_domain}</p>
                )}
                {lead.company?.cnpj && (
                  <p className="text-xs text-muted-foreground pl-6">CNPJ: {lead.company.cnpj}</p>
                )}
              </div>
            </div>

            {lead.apollo_raw && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados Apollo</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40">
                    {JSON.stringify(lead.apollo_raw, null, 2)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
