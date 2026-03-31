import { Info } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import type { QualificationFilters as Filters } from '../../types'
import { REGIME_LABELS, PORTE_LABELS } from '../../lib/utils'

const REGIME_OPTIONS = [
  { value: 'simples', label: REGIME_LABELS.simples },
  { value: 'lucro_presumido', label: REGIME_LABELS.lucro_presumido },
  { value: 'lucro_real', label: REGIME_LABELS.lucro_real },
  { value: 'outros', label: REGIME_LABELS.outros },
]

const PORTE_OPTIONS = [
  { value: 'me', label: PORTE_LABELS.me },
  { value: 'epp', label: PORTE_LABELS.epp },
  { value: 'medio', label: PORTE_LABELS.medio },
  { value: 'grande', label: PORTE_LABELS.grande },
  { value: 'outros', label: PORTE_LABELS.outros },
]

interface QualificationFiltersProps {
  value: Filters
  onChange: (filters: Filters) => void
}

function toggle<T extends string>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

export function QualificationFilters({ value, onChange }: QualificationFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Regime */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Regime Tributário</p>
          <div className="space-y-2">
            {REGIME_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`regime-${opt.value}`}
                  checked={value.regime.includes(opt.value as never)}
                  onCheckedChange={() =>
                    onChange({ ...value, regime: toggle(value.regime, opt.value as never) })
                  }
                />
                <Label htmlFor={`regime-${opt.value}`} className="text-sm font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Porte */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Porte da Empresa</p>
          <div className="space-y-2">
            {PORTE_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <Checkbox
                  id={`porte-${opt.value}`}
                  checked={value.porte.includes(opt.value as never)}
                  onCheckedChange={() =>
                    onChange({ ...value, porte: toggle(value.porte, opt.value as never) })
                  }
                />
                <Label htmlFor={`porte-${opt.value}`} className="text-sm font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <p>Apenas empresas que corresponderem aos filtros selecionados serão qualificadas para enriquecimento.</p>
      </div>
    </div>
  )
}
