import type { ReactNode } from 'react'

interface HeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex items-start justify-between pb-6 border-b border-border">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
