import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, GripVertical } from 'lucide-react'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { TemplateEditor } from '../campaigns/TemplateEditor'
import type { StepForm } from '../../hooks/useSequences'

const stepSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  condition: z.enum(['no_reply', 'no_open', 'always']),
  delay_value: z.coerce.number().min(1, 'Mínimo 1'),
  delay_unit: z.enum(['hours', 'days']),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  body_template: z.string().min(1, 'Corpo é obrigatório'),
})

type StepEditorValues = Omit<StepForm, 'step_number'>

interface StepEditorProps {
  stepNumber: number
  defaultValues: StepEditorValues
  onChange: (values: StepEditorValues) => void
  onRemove: () => void
}

export function StepEditor({ stepNumber, defaultValues, onChange, onRemove }: StepEditorProps) {
  const { register, control, watch, formState: { errors } } = useForm<StepEditorValues>({
    resolver: zodResolver(stepSchema),
    defaultValues,
    mode: 'onChange',
  })

  // Sync parent on every change
  const values = watch()
  const handleChange = () => {
    const v = watch()
    onChange(v)
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Passo {stepNumber}
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-red-400 hover:text-red-300" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Nome do passo</Label>
          <Input
            placeholder="Ex: Follow-up 1 — sem resposta"
            {...register('name', { onChange: handleChange })}
          />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Condição de envio</Label>
          <Controller
            name="condition"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={(v) => { field.onChange(v); handleChange() }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no_reply">Sem resposta</SelectItem>
                  <SelectItem value="no_open">Sem abertura</SelectItem>
                  <SelectItem value="always">Sempre enviar</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Aguardar</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              className="h-8 text-xs w-20"
              {...register('delay_value', { onChange: handleChange })}
            />
            <Controller
              name="delay_unit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => { field.onChange(v); handleChange() }}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">horas</SelectItem>
                    <SelectItem value="days">dias</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.delay_value && <p className="text-xs text-red-400">{errors.delay_value.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Assunto</Label>
        <Input
          placeholder="Assunto do e-mail com {{variáveis}}"
          className="text-xs"
          {...register('subject', { onChange: handleChange })}
        />
        {errors.subject && <p className="text-xs text-red-400">{errors.subject.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Corpo do e-mail (HTML)</Label>
        <Controller
          name="body_template"
          control={control}
          render={({ field }) => (
            <TemplateEditor
              value={field.value}
              onChange={(v) => { field.onChange(v); onChange({ ...values, body_template: v }) }}
              activeField="body"
              onFocus={() => {}}
            />
          )}
        />
        {errors.body_template && <p className="text-xs text-red-400">{errors.body_template.message}</p>}
      </div>
    </div>
  )
}
