import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { StepBuilder } from '../components/followup/StepBuilder'
import { useCreateSequence, useUpdateSequence, useUpsertSteps, useSequence } from '../hooks/useSequences'
import type { StepForm } from '../hooks/useSequences'

type StepEditorValues = Omit<StepForm, 'step_number'>

export function NovaSequenciaPage() {
  const { id } = useParams<{ id: string }>()
  const isEditing = !!id
  const navigate = useNavigate()

  const { data: sequence, isLoading } = useSequence(id)
  const { mutateAsync: createSequence, isPending: isCreating } = useCreateSequence()
  const { mutateAsync: updateSequence, isPending: isUpdating } = useUpdateSequence()
  const { mutateAsync: upsertSteps, isPending: isSavingSteps } = useUpsertSteps()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [steps, setSteps] = useState<StepEditorValues[]>([])

  useEffect(() => {
    if (sequence && isEditing) {
      setName(sequence.name)
      setDescription(sequence.description ?? '')
      setIsActive(sequence.is_active)
      if (sequence.steps) {
        setSteps(sequence.steps.map(s => ({
          name: s.name,
          condition: s.condition,
          delay_value: s.delay_value,
          delay_unit: s.delay_unit,
          subject: s.subject,
          body_template: s.body_template,
        })))
      }
    }
  }, [sequence, isEditing])

  const isSaving = isCreating || isUpdating || isSavingSteps

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome da sequência é obrigatório')
      return
    }

    try {
      let seqId = id
      if (isEditing && id) {
        await updateSequence({ id, values: { name, description: description || undefined, is_active: isActive } })
      } else {
        const seq = await createSequence({ name, description: description || undefined, is_active: isActive })
        seqId = seq.id
        navigate(`/follow-ups/sequencias/${seqId}/editar`, { replace: true })
      }

      if (seqId) {
        const stepsWithNumbers: StepForm[] = steps.map((s, i) => ({ ...s, step_number: i + 1 }))
        await upsertSteps({ sequenceId: seqId, steps: stepsWithNumbers })
      }

      toast.success(isEditing ? 'Sequência atualizada!' : 'Sequência criada!')
    } catch (err) {
      toast.error(`Erro ao salvar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  if (isEditing && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/follow-ups')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Header
          title={isEditing ? 'Editar sequência' : 'Nova sequência'}
          description="Configure os passos de follow-up e suas condições de envio"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome da sequência</Label>
                <Input
                  placeholder="Ex: Prospecção Contadores SP"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                <Input
                  placeholder="Ex: Sequência para leads de contabilidade"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Sequência ativa</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </CardContent>
          </Card>

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar sequência
          </Button>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Passos da sequência</CardTitle>
            </CardHeader>
            <CardContent>
              <StepBuilder steps={steps} onChange={setSteps} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
