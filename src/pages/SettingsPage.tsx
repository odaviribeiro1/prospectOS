import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertTriangle, Save, Loader2, Copy, Check } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { ApiKeyField } from '../components/settings/ApiKeyField'
import { ConnectionTest } from '../components/settings/ConnectionTest'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { settingsSchema, type SettingsForm } from '../lib/validators'
import { useSettings } from '../hooks/useSettings'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/resend-webhook` : ''

export function SettingsPage() {
  const { settings, isLoading, saveSettings, isSaving } = useSettings()
  const [cnpjaKey, setCnpjaKey] = useState('')
  const [apolloKey, setApolloKey] = useState('')
  const [resendKey, setResendKey] = useState('')
  const [chatwootToken, setChatwootToken] = useState('')
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  useEffect(() => {
    if (settings) {
      reset({
        resend_api_key: settings.resend_api_key ?? '',
        resend_from_email: settings.resend_from_email ?? '',
        resend_from_name: settings.resend_from_name ?? '',
        chatwoot_url: settings.chatwoot_url ?? '',
        chatwoot_api_token: settings.chatwoot_api_token ?? '',
        chatwoot_account_id: settings.chatwoot_account_id ?? undefined,
        chatwoot_inbox_id: settings.chatwoot_inbox_id ?? undefined,
        whatsapp_link: settings.whatsapp_link ?? '',
      })
      setCnpjaKey(settings.cnpja_api_key ?? '')
      setApolloKey(settings.apollo_api_key ?? '')
      setResendKey(settings.resend_api_key ?? '')
      setChatwootToken(settings.chatwoot_api_token ?? '')
    }
  }, [settings, reset])

  const onSubmit = async (values: SettingsForm) => {
    try {
      await saveSettings({
        ...values,
        cnpja_api_key: cnpjaKey,
        apollo_api_key: apolloKey,
        resend_api_key: resendKey,
        chatwoot_api_token: chatwootToken,
      })
      toast.success('Configurações salvas com sucesso!')
    } catch {
      toast.error('Erro ao salvar configurações. Tente novamente.')
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasKeys = !!(settings?.cnpja_api_key && settings?.apollo_api_key)

  return (
    <div className="space-y-6">
      <Header
        title="Configurações"
        description="Gerencie suas API keys e integrações"
        actions={
          <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
        }
      />

      {!hasKeys && !isLoading && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium">Configure suas API keys para começar</p>
            <p className="text-xs text-amber-400/80 mt-0.5">Adicione as chaves do CNPJá e Apollo.io para usar a plataforma.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* CNPJá */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">CNPJá API</CardTitle>
            <CardDescription>Usada para consultar dados de empresas pelo CNPJ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApiKeyField id="cnpja_key" label="API Key" value={cnpjaKey} onChange={setCnpjaKey} placeholder="Sua chave da API CNPJá" />
            <ConnectionTest service="cnpja" apiKey={cnpjaKey} />
          </CardContent>
        </Card>

        {/* Apollo */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Apollo.io API</CardTitle>
            <CardDescription>Usada para enriquecer dados de sócios e encontrar e-mails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApiKeyField id="apollo_key" label="API Key" value={apolloKey} onChange={setApolloKey} placeholder="Sua chave da API Apollo.io" />
            <ConnectionTest service="apollo" apiKey={apolloKey} />
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">WhatsApp</CardTitle>
            <CardDescription>Link para usar como variável nos templates de e-mail</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="whatsapp_link">Link do WhatsApp</Label>
              <Input id="whatsapp_link" type="url" placeholder="https://wa.me/5548999999999" {...register('whatsapp_link')} />
              {errors.whatsapp_link && <p className="text-xs text-red-400">{errors.whatsapp_link.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Resend */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Resend (E-mail)</CardTitle>
            <CardDescription>Disparo de campanhas de e-mail outbound</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApiKeyField
              id="resend_key"
              label="API Key"
              value={resendKey}
              onChange={(v) => {
                setResendKey(v)
              }}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="resend_from_email">E-mail de envio</Label>
                <Input id="resend_from_email" type="email" placeholder="outreach@suaempresa.com" {...register('resend_from_email')} />
                {errors.resend_from_email && <p className="text-xs text-red-400">{errors.resend_from_email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resend_from_name">Nome de exibição</Label>
                <Input id="resend_from_name" placeholder="Davi — Agentise" {...register('resend_from_name')} />
              </div>
            </div>
            <ConnectionTest service="resend" label="Enviar e-mail de teste" />

            {webhookUrl && (
              <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Para rastrear entregas e aberturas, configure um webhook no painel do Resend
                  apontando para a URL abaixo. Selecione todos os eventos.
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background border rounded px-2 py-1 flex-1 truncate">{webhookUrl}</code>
                  <Button type="button" variant="outline" size="sm" onClick={copyWebhookUrl}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chatwoot */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Chatwoot</CardTitle>
            <CardDescription>Integração com CRM para gestão de conversas e respostas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="chatwoot_url">URL da instância</Label>
              <Input id="chatwoot_url" type="url" placeholder="https://app.chatwoot.com" {...register('chatwoot_url')} />
              {errors.chatwoot_url && <p className="text-xs text-red-400">{errors.chatwoot_url.message}</p>}
            </div>
            <ApiKeyField
              id="chatwoot_token"
              label="API Token"
              value={chatwootToken}
              onChange={setChatwootToken}
              placeholder="Seu token de acesso do Chatwoot"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="chatwoot_account_id">Account ID</Label>
                <Input id="chatwoot_account_id" type="number" placeholder="123" {...register('chatwoot_account_id')} />
              </div>
              <div className="space-y-1.5">
                <TooltipProvider>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Label htmlFor="chatwoot_inbox_id">Inbox ID (Email)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground cursor-help border border-muted-foreground/30 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">ID da inbox do tipo Email configurada no seu Chatwoot</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <Input id="chatwoot_inbox_id" type="number" placeholder="456" {...register('chatwoot_inbox_id')} />
              </div>
            </div>
            <ConnectionTest service="chatwoot" />
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar configurações
          </Button>
        </div>
      </form>
    </div>
  )
}
