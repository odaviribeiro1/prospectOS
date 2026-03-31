import type { EnrichedLead } from '../types'

export function renderTemplate(template: string, lead: EnrichedLead, whatsappLink: string): string {
  const firstName = lead.nome.split(' ')[0]
  const vars: Record<string, string> = {
    nome: firstName,
    nome_completo: lead.nome,
    empresa: lead.empresa_nome || '',
    cargo: lead.cargo || '',
    email: lead.email || '',
    link_whatsapp: whatsappLink || '',
  }
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

export function renderWithExamples(template: string, whatsappLink = 'https://wa.me/5548999999999'): string {
  const examples: Record<string, string> = {
    nome: 'João',
    nome_completo: 'João da Silva',
    empresa: 'Empresa XYZ Ltda',
    cargo: 'Diretor Comercial',
    email: 'joao@empresa.com.br',
    link_whatsapp: whatsappLink,
  }
  let result = template
  for (const [key, value] of Object.entries(examples)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}
