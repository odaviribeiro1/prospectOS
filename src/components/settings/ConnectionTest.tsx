import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface ConnectionTestProps {
  service: 'cnpja' | 'apollo' | 'resend' | 'chatwoot'
  apiKey?: string
  disabled?: boolean
  label?: string
}

export function ConnectionTest({ service, apiKey, disabled, label }: ConnectionTestProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

  const isEmpty = service === 'resend' || service === 'chatwoot' ? false : !apiKey?.trim()

  const test = async () => {
    if (isEmpty) {
      toast.error('Insira a API key antes de testar')
      return
    }

    setStatus('testing')
    try {
      if (service === 'cnpja') {
        const { data, error } = await supabase.functions.invoke('cnpja-lookup', {
          body: { cnpj: '00000000000191', test: true },
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        setStatus('ok')
        toast.success('CNPJá conectado com sucesso!')

      } else if (service === 'apollo') {
        const { data, error } = await supabase.functions.invoke('apollo-enrich', {
          body: { test: true },
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        setStatus('ok')
        toast.success('Apollo.io conectado com sucesso!')

      } else if (service === 'resend') {
        const { data, error } = await supabase.functions.invoke('resend-send', {
          body: { test: true },
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        setStatus('ok')
        toast.success('E-mail de teste enviado! Verifique sua caixa de entrada.')

      } else if (service === 'chatwoot') {
        const { data, error } = await supabase.functions.invoke('chatwoot-test', {
          body: {},
        })
        if (error || data?.error) throw new Error(data?.error || error?.message)
        setStatus('ok')
        toast.success(`Conectado ao Chatwoot como ${data.agent_name}`)
      }
    } catch (err) {
      setStatus('error')
      toast.error(`Erro ao conectar: ${err instanceof Error ? err.message : 'Verifique suas configurações'}`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={test}
        disabled={disabled || status === 'testing' || isEmpty}
      >
        {status === 'testing' && <Loader2 className="h-3 w-3 animate-spin" />}
        {label || 'Testar conexão'}
      </Button>
      {status === 'ok' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
      {status === 'error' && <XCircle className="h-4 w-4 text-red-400" />}
    </div>
  )
}
