import { ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { TEMPLATE_VARIABLES } from '../../types'

interface VariableInserterProps {
  onInsert: (key: string) => void
}

export function VariableInserter({ onInsert }: VariableInserterProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Inserir variável <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {TEMPLATE_VARIABLES.map((v) => (
          <DropdownMenuItem key={v.key} onClick={() => onInsert(v.key)} className="flex flex-col items-start gap-0.5">
            <span className="font-mono text-xs text-primary">{`{{${v.key}}}`}</span>
            <span className="text-xs text-muted-foreground">{v.label} · ex: {v.example}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
