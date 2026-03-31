import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import type { OnboardingStatus } from '../../hooks/useOnboarding'

const STORAGE_KEY = 'agentise_onboarding_dismissed'

interface Step {
  key: keyof OnboardingStatus
  label: string
  href?: string
  optional?: boolean
}

const STEPS: Step[] = [
  { key: 'hasApiKeys', label: 'Configurar API Keys (CNPJá + Apollo)', href: '/settings' },
  { key: 'hasResend', label: 'Configurar Resend para envio de e-mails', href: '/settings' },
  { key: 'hasChatwoot', label: 'Configurar Chatwoot (opcional)', href: '/settings', optional: true },
  { key: 'hasFirstBatch', label: 'Realizar primeira consulta de CNPJ', href: '/consulta' },
  { key: 'hasFirstList', label: 'Enriquecer e revisar leads', href: '/listas' },
  { key: 'hasFirstCampaign', label: 'Enviar primeira campanha de e-mail', href: '/campanhas' },
]

interface OnboardingBannerProps {
  status: OnboardingStatus
}

export function OnboardingBanner({ status }: OnboardingBannerProps) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === '1')
  const [expanded, setExpanded] = useState(true)

  if (dismissed || status.isComplete) return null

  const requiredSteps = STEPS.filter(s => !s.optional)
  const completedRequired = requiredSteps.filter(s => !!status[s.key]).length
  const totalRequired = requiredSteps.length
  const progressPct = Math.round((completedRequired / totalRequired) * 100)

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-sm">Bem-vindo ao Agentise Leads!</h3>
            <span className="text-xs text-muted-foreground">
              {completedRequired}/{totalRequired} passos concluídos
            </span>
          </div>
          <Progress value={progressPct} className="h-1.5 mt-2 max-w-xs" />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleDismiss}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2">
          {STEPS.map(step => {
            const done = !!status[step.key]
            return (
              <div key={step.key} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <span className={`text-xs ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {step.label}
                    {step.optional && <span className="text-muted-foreground ml-1">(opcional)</span>}
                  </span>
                </div>
                {!done && step.href && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2 text-primary hover:text-primary shrink-0"
                    onClick={() => navigate(step.href!)}
                  >
                    {done ? 'Concluído' : 'Configurar →'}
                  </Button>
                )}
                {done && <span className="text-xs text-emerald-400 shrink-0">Concluído</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
