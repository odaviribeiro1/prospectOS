import { useNavigate } from 'react-router-dom'
import { Button } from './button'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const navigate = useNavigate()

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className ?? ''}`}>
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-5" onClick={() => navigate(action.href)}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
