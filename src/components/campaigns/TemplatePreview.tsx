import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { renderTemplate } from '../../lib/resend'
import { renderWithExamples } from '../../lib/resend'
import type { EnrichedLead } from '../../types'

interface TemplatePreviewProps {
  subject: string
  body: string
  fromName: string
  fromEmail: string
  whatsappLink: string
  leads: EnrichedLead[]
  previewIndex: number
  onPrev: () => void
  onNext: () => void
}

export function TemplatePreview({
  subject, body, fromName, fromEmail, whatsappLink,
  leads, previewIndex, onPrev, onNext,
}: TemplatePreviewProps) {
  const lead = leads[previewIndex]

  const renderedSubject = lead
    ? renderTemplate(subject, lead, whatsappLink)
    : renderWithExamples(subject, whatsappLink)

  const renderedBody = lead
    ? renderTemplate(body, lead, whatsappLink)
    : renderWithExamples(body, whatsappLink)

  const toEmail = lead?.email ?? 'lead@empresa.com.br'
  const toName = lead?.nome ?? 'Lead de Exemplo'

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col h-full">
      {/* Email client header */}
      <div className="border-b p-4 space-y-1 bg-muted/20">
        <div className="text-xs text-muted-foreground flex gap-2">
          <span className="font-medium text-foreground">De:</span>
          <span>{fromName} &lt;{fromEmail}&gt;</span>
        </div>
        <div className="text-xs text-muted-foreground flex gap-2">
          <span className="font-medium text-foreground">Para:</span>
          <span>{toName} &lt;{toEmail}&gt;</span>
        </div>
        <div className="text-xs flex gap-2">
          <span className="font-medium text-foreground">Assunto:</span>
          <span className="truncate">{renderedSubject || <span className="text-muted-foreground italic">Sem assunto</span>}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        {renderedBody ? (
          <div
            className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderedBody }}
          />
        ) : (
          <p className="text-muted-foreground text-sm italic">O corpo do e-mail aparecerá aqui conforme você digita...</p>
        )}
      </div>

      {/* Lead navigation */}
      {leads.length > 0 && (
        <div className="border-t p-3 flex items-center justify-between text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onPrev} disabled={previewIndex === 0}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>Lead {previewIndex + 1} de {leads.length}</span>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onNext} disabled={previewIndex >= leads.length - 1}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}
