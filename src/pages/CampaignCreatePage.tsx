import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { TemplateEditor } from '../components/campaigns/TemplateEditor'
import { TemplatePreview } from '../components/campaigns/TemplatePreview'
import { SendConfirmModal } from '../components/campaigns/SendConfirmModal'
import { VariableInserter } from '../components/campaigns/VariableInserter'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Skeleton } from '../components/ui/skeleton'
import { campaignSchema, type CampaignForm } from '../lib/validators'
import { useCreateCampaign, useUpdateCampaign, useCampaign, useSendCampaign } from '../hooks/useCampaigns'
import { useLeadLists, useLeads } from '../hooks/useLeadLists'

const DEFAULT_FROM_NAME = import.meta.env.VITE_RESEND_FROM_NAME ?? ''
const DEFAULT_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL ?? ''
const DEFAULT_WHATSAPP_LINK = import.meta.env.VITE_WHATSAPP_LINK ?? ''

export function CampaignCreatePage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()

  const { data: campaign, isLoading: loadingCampaign } = useCampaign(id)
  const { data: lists = [] } = useLeadLists()
  const { mutateAsync: createCampaign, isPending: isCreating } = useCreateCampaign()
  const { mutateAsync: updateCampaign, isPending: isUpdating } = useUpdateCampaign()
  const { mutateAsync: sendCampaign } = useSendCampaign()

  const [activeField, setActiveField] = useState<'subject' | 'body'>('body')
  const [previewIndex, setPreviewIndex] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const subjectRef = useRef<HTMLInputElement | null>(null)

  const reviewedLists = lists.filter(l => l.status === 'reviewed' && l.approved_leads > 0)

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      list_id: '',
      from_name: DEFAULT_FROM_NAME,
      from_email: DEFAULT_FROM_EMAIL,
      subject: '',
      body_template: '',
      whatsapp_link: DEFAULT_WHATSAPP_LINK,
    },
  })

  const watchedListId = watch('list_id')
  const { data: previewLeads = [] } = useLeads(watchedListId || undefined)
  const approvedLeads = previewLeads.filter(l => l.status === 'approved' && l.email)

  const subject = watch('subject')
  const body = watch('body_template')
  const fromName = watch('from_name')
  const fromEmail = watch('from_email')
  const whatsappLink = watch('whatsapp_link') ?? ''

  useEffect(() => {
    if (campaign && isEditing) {
      reset({
        name: campaign.name,
        list_id: campaign.list_id ?? '',
        from_name: campaign.from_name,
        from_email: campaign.from_email,
        subject: campaign.subject,
        body_template: campaign.body_template,
        whatsapp_link: campaign.whatsapp_link ?? '',
      })
    }
  }, [campaign, isEditing, reset])

  const insertIntoSubject = (key: string) => {
    const el = subjectRef.current
    const token = `{{${key}}}`
    if (el) {
      const start = el.selectionStart ?? subject.length
      const end = el.selectionEnd ?? subject.length
      const newVal = subject.substring(0, start) + token + subject.substring(end)
      setValue('subject', newVal)
      requestAnimationFrame(() => {
        el.focus()
        el.selectionStart = start + token.length
        el.selectionEnd = start + token.length
      })
    } else {
      setValue('subject', subject + token)
    }
  }

  const onSaveDraft = async (data: CampaignForm) => {
    try {
      if (isEditing && id) {
        await updateCampaign({ id, values: data })
        toast.success('Rascunho atualizado!')
      } else {
        const c = await createCampaign(data)
        toast.success('Rascunho salvo!')
        navigate(`/campanhas/${c.id}/editar`, { replace: true })
      }
    } catch {
      toast.error('Erro ao salvar rascunho.')
    }
  }

  const onSendConfirm = async () => {
    const campaignId = id
    if (!campaignId) return
    try {
      const result = await sendCampaign(campaignId)
      toast.success(`Campanha enviada! ${result.sent} de ${result.total} e-mails disparados.`)
      navigate(`/campanhas/${campaignId}`)
    } catch (err) {
      toast.error(`Erro ao enviar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  const isSaving = isCreating || isUpdating

  // Subject field registration with merged ref
  const { ref: subjectRegRef, ...subjectRegProps } = register('subject')

  if (isEditing && loadingCampaign) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
          <Skeleton className="lg:col-span-2 h-96" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/campanhas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Header
          title={isEditing ? 'Editar campanha' : 'Nova campanha'}
          description="Configure o template e dispare manualmente quando estiver pronto"
        />
      </div>

      <form onSubmit={handleSubmit(onSaveDraft)}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Editor */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome da campanha</Label>
                  <Input placeholder="Ex: Contadores SP — Abril 2026" {...register('name')} />
                  {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Lista de leads</Label>
                  <Controller
                    name="list_id"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma lista revisada..." />
                        </SelectTrigger>
                        <SelectContent>
                          {reviewedLists.length === 0 ? (
                            <SelectItem value="_none" disabled>Nenhuma lista revisada disponível</SelectItem>
                          ) : (
                            reviewedLists.map(l => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.title} · {l.approved_leads} leads aprovados
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.list_id && <p className="text-xs text-red-400">{errors.list_id.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nome do remetente</Label>
                    <Input placeholder="Davi — Agentise" {...register('from_name')} />
                    {errors.from_name && <p className="text-xs text-red-400">{errors.from_name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail de envio</Label>
                    <Input type="email" placeholder="outreach@empresa.com" {...register('from_email')} />
                    {errors.from_email && <p className="text-xs text-red-400">{errors.from_email.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Assunto</Label>
                    {activeField === 'subject' && (
                      <VariableInserter onInsert={insertIntoSubject} />
                    )}
                  </div>
                  <Input
                    ref={(el) => {
                      subjectRef.current = el
                      subjectRegRef(el)
                    }}
                    placeholder="Olá {{nome}}, vi sua empresa {{empresa}}..."
                    onFocus={() => setActiveField('subject')}
                    {...subjectRegProps}
                  />
                  {errors.subject && <p className="text-xs text-red-400">{errors.subject.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Corpo do e-mail (HTML)</Label>
                  <Controller
                    name="body_template"
                    control={control}
                    render={({ field }) => (
                      <TemplateEditor
                        value={field.value}
                        onChange={field.onChange}
                        activeField={activeField}
                        onFocus={() => setActiveField('body')}
                      />
                    )}
                  />
                  {errors.body_template && <p className="text-xs text-red-400">{errors.body_template.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Link WhatsApp <span className="text-muted-foreground font-normal">(variável {`{{link_whatsapp}}`})</span></Label>
                  <Input placeholder="https://wa.me/5548999999999" {...register('whatsapp_link')} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button type="submit" variant="outline" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar rascunho
              </Button>
              <Button
                type="button"
                disabled={!isEditing || campaign?.status !== 'draft'}
                onClick={() => setConfirmOpen(true)}
              >
                Disparar campanha
              </Button>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2 min-h-[500px]">
            <TemplatePreview
              subject={subject}
              body={body}
              fromName={fromName}
              fromEmail={fromEmail}
              whatsappLink={whatsappLink}
              leads={approvedLeads}
              previewIndex={previewIndex}
              onPrev={() => setPreviewIndex(i => Math.max(0, i - 1))}
              onNext={() => setPreviewIndex(i => Math.min(approvedLeads.length - 1, i + 1))}
            />
          </div>
        </div>
      </form>

      <SendConfirmModal
        open={confirmOpen}
        campaign={campaign ?? null}
        recipientCount={approvedLeads.length}
        onConfirm={onSendConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
