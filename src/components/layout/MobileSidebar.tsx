import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Menu, X, Search, Building2, List, BarChart3, Mail,
  Settings, Target, Forward, LogOut, User,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import { usePendingCount } from '../../hooks/useEnrollments'

const menuItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/metricas' },
  { icon: Search, label: 'Consulta CNPJ', path: '/consulta' },
  { icon: Building2, label: 'Empresas', path: '/empresas' },
  { icon: List, label: 'Listas', path: '/listas' },
  { icon: Mail, label: 'Campanhas', path: '/campanhas' },
  { icon: Forward, label: 'Follow-ups', path: '/follow-ups' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
  { icon: User, label: 'Meu Perfil', path: '/perfil' },
]

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { data: pendingCount = 0 } = usePendingCount()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    navigate('/login')
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-in panel */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-sidebar-primary/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-sidebar-primary" />
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground">Agentise Leads</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isFollowUps = item.path === '/follow-ups'
            const showBadge = isFollowUps && pendingCount > 0
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-muted-foreground hover:text-sidebar-foreground text-sm gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </div>
    </>
  )
}
