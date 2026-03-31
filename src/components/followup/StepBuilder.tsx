import { Plus, ArrowDown } from 'lucide-react'
import { Button } from '../ui/button'
import { StepEditor } from './StepEditor'
import { formatDelay, conditionLabel } from '../../lib/followup'
import type { StepForm } from '../../hooks/useSequences'

type StepEditorValues = Omit<StepForm, 'step_number'>

interface StepBuilderProps {
  steps: StepEditorValues[]
  onChange: (steps: StepEditorValues[]) => void
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  const addStep = () => {
    onChange([
      ...steps,
      {
        name: `Follow-up ${steps.length + 1}`,
        condition: 'no_reply',
        delay_value: 3,
        delay_unit: 'days',
        subject: '',
        body_template: '',
      },
    ])
  }

  const updateStep = (index: number, values: StepEditorValues) => {
    const next = [...steps]
    next[index] = values
    onChange(next)
  }

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={index}>
          {index > 0 && (
            <div className="flex flex-col items-center py-1 text-xs text-muted-foreground">
              <ArrowDown className="h-3 w-3 mb-0.5" />
              <span className="bg-muted rounded px-2 py-0.5 text-[10px]">
                {conditionLabel(steps[index].condition)} · após {formatDelay({ delay_value: steps[index].delay_value, delay_unit: steps[index].delay_unit })}
              </span>
            </div>
          )}
          <StepEditor
            stepNumber={index + 1}
            defaultValues={step}
            onChange={(values) => updateStep(index, values)}
            onRemove={() => removeStep(index)}
          />
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full mt-2 border-dashed" onClick={addStep}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar passo
      </Button>
    </div>
  )
}
