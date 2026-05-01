import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export const registerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
})

export const batchSchema = z.object({
  name: z.string().min(1, 'Nome do lote é obrigatório'),
  cnpjs: z.array(z.string()).min(1, 'Adicione pelo menos 1 CNPJ'),
  filter_regime: z.array(z.string()).min(1, 'Selecione pelo menos 1 regime'),
  filter_porte: z.array(z.string()).min(1, 'Selecione pelo menos 1 porte'),
})

export const campaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha é obrigatório'),
  list_id: z.string().min(1, 'Selecione uma lista'),
  from_name: z.string().min(1, 'Nome do remetente é obrigatório'),
  from_email: z.string().email('E-mail do remetente inválido'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  body_template: z.string().min(1, 'Corpo do e-mail é obrigatório'),
  whatsapp_link: z.string().optional(),
})

export type CampaignForm = z.infer<typeof campaignSchema>

export type LoginForm = z.infer<typeof loginSchema>
export type RegisterForm = z.infer<typeof registerSchema>
export type BatchForm = z.infer<typeof batchSchema>
