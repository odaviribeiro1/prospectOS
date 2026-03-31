import type { DelayUnit, FollowUpStep, EnrichedLead } from '../types'

export function calcNextDue(from: Date, delayValue: number, delayUnit: DelayUnit): Date {
  const ms = delayUnit === 'hours' ? delayValue * 60 * 60 * 1000 : delayValue * 24 * 60 * 60 * 1000
  return new Date(from.getTime() + ms)
}

export function isStepDue(nextStepDueAt: string | null): boolean {
  if (!nextStepDueAt) return false
  return new Date(nextStepDueAt) <= new Date()
}

export function renderFollowUpTemplate(template: string, lead: EnrichedLead, whatsappLink = ''): string {
  const firstName = lead.nome.split(' ')[0]
  const vars: Record<string, string> = {
    nome: firstName,
    nome_completo: lead.nome,
    empresa: lead.empresa_nome || '',
    cargo: lead.cargo || '',
    email: lead.email || '',
    link_whatsapp: whatsappLink,
  }
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

export function formatDelay(step: Pick<FollowUpStep, 'delay_value' | 'delay_unit'>): string {
  const { delay_value, delay_unit } = step
  if (delay_unit === 'hours') return `${delay_value}h`
  return delay_value === 1 ? '1 dia' : `${delay_value} dias`
}

export function conditionLabel(condition: FollowUpStep['condition']): string {
  switch (condition) {
    case 'no_reply': return 'Sem resposta'
    case 'no_open': return 'Sem abertura'
    case 'always': return 'Sempre'
  }
}
