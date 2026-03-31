import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formata CNPJ: 00.000.000/0000-00
export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

// Remove formatação do CNPJ
export function cleanCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, '')
}

// Valida CNPJ
export function isValidCnpj(cnpj: string): boolean {
  const digits = cleanCnpj(cnpj)
  if (digits.length !== 14) return false
  if (/^(\d)\1+$/.test(digits)) return false

  const calcDigit = (d: string, factor: number) => {
    let sum = 0
    for (let i = 0; i < d.length; i++) {
      sum += parseInt(d[i]) * factor--
      if (factor < 2) factor = 9
    }
    const r = 11 - (sum % 11)
    return r < 2 ? 0 : r
  }

  const d1 = calcDigit(digits.slice(0, 12), 5)
  if (d1 !== parseInt(digits[12])) return false
  const d2 = calcDigit(digits.slice(0, 13), 6)
  return d2 === parseInt(digits[13])
}

// Extrai CNPJs de um texto (aceita formatados ou só dígitos)
export function extractCnpjs(text: string): string[] {
  const matches = text.match(/\d{2}[\.\-]?\d{3}[\.\-]?\d{3}[\/]?\d{4}[\-]?\d{2}/g) || []
  const unique = [...new Set(matches.map(cleanCnpj))]
  return unique.filter(isValidCnpj)
}

// Separa nome em primeiro e último
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

// Labels PT-BR para enums
export const REGIME_LABELS: Record<string, string> = {
  simples: 'Simples Nacional',
  lucro_real: 'Lucro Real',
  lucro_presumido: 'Lucro Presumido',
  outros: 'Outros',
}

export const PORTE_LABELS: Record<string, string> = {
  me: 'Microempresa',
  epp: 'Pequeno Porte',
  medio: 'Médio Porte',
  grande: 'Grande Porte',
  outros: 'Outros',
}

export const LIST_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Pendente Revisão',
  reviewed: 'Revisada',
  in_campaign: 'Em Campanha',
}

export const LEAD_STATUS_LABELS: Record<string, string> = {
  pending_review: 'Aguardando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  contacted: 'Contactado',
  responded: 'Respondeu',
  negative_response: 'Resp. Negativa',
  converted: 'Convertido',
}

// Formata data BR
export function formatDateBR(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch {
    return isoDate
  }
}

export function formatDateTimeBR(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return isoDate
  }
}

// Delay
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
