import { NavLink, useNavigate } from 'react-router-dom'
import {
  Search, Building2, List, BarChart3, Mail, Settings,
  Target, ChevronLeft, ChevronRight, LogOut, Forward, User,
  Sun, Moon,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../stores/appStore'
import { useSettings } from '../../hooks/useSettings'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import { useState, useEffect } from 'react'
import { usePendingCount } from '../../hooks/useEnrollments'

const menuItems = [
  { icon: BarChart3, label: 'Dashboard', path: '/metricas' },
  { icon: Search, label: 'Consulta CNPJ', path: '/consulta' },
  { icon: Building2, label: 'Empresas', path: '/empresas' },
  { icon: List, label: 'Listas', path: '/listas' },
  { icon: Mail, label: 'Campanhas', path: '/campanhas' },
  { icon: Forward, label: 'Follow-ups', path: '/follow-ups' },
]

const bottomItems = [
  { icon: Settings, label: 'Configurações', path: '/settings' },
  { icon: User, label: 'Meu Perfil', path: '/perfil' },
]

function IntegrationDot({ configured, label }: { configured: boolean; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`h-2 w-2 rounded-full ${configured ? 'bg-emerald-400' : 'bg-red-400'}`} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}: {configured ? 'configurado' : 'não configurado'}
      </TooltipContent>
    </Tooltip>
  )
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore()
  const navigate = useNavigate()
  const [userEmail, setUserEmail] = useState('')
  const { data: pendingCount = 0 } = usePendingCount()
  const { settings } = useSettings()
  
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  const toggleTheme = () => {
    const root = window.document.documentElement
    root.classList.toggle('dark')
    const isNowDark = root.classList.contains('dark')
    setIsDark(isNowDark)
    // Optional: save to localStorage if user wants to persist it permanently without relying on class alone
    localStorage.setItem('theme', isNowDark ? 'dark' : 'light')
  }

  useEffect(() => {
    // Carregar email do usuário
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
    })

    // Carregar tema salvo
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      const isDarkTheme = savedTheme === 'dark'
      document.documentElement.classList.toggle('dark', isDarkTheme)
      setIsDark(isDarkTheme)
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    navigate('/login')
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '?'

  const integrations = [
    { key: 'cnpja', configured: !!settings?.cnpja_api_key, label: 'CNPJá' },
    { key: 'apollo', configured: !!settings?.apollo_api_key, label: 'Apollo' },
    { key: 'resend', configured: !!settings?.resend_api_key, label: 'Resend' },
    { key: 'chatwoot', configured: !!(settings?.chatwoot_url && settings?.chatwoot_api_token), label: 'Chatwoot' },
  ]

  const allItems = [...menuItems, ...bottomItems]

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 shrink-0',
          sidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-3 p-4 border-b border-sidebar-border', !sidebarOpen && 'justify-center')}>
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-sidebar-primary/20 shrink-0">
            <Target className="h-4 w-4 text-sidebar-primary" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground leading-none">Agentise</p>
              <p className="text-xs text-sidebar-muted-foreground">Leads</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {allItems.map((item) => {
            const isFollowUps = item.path === '/follow-ups'
            const showBadge = isFollowUps && pendingCount > 0
            const navItem = (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors group',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    !sidebarOpen && 'justify-center px-2'
                  )
                }
              >
                <div className="relative shrink-0">
                  <item.icon className="h-4 w-4" />
                  {!sidebarOpen && showBadge && (
                    <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                {sidebarOpen && (
                  <>
                    <span className="flex-1 truncate">{item.label}</span>
                    {showBadge && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[20px] justify-center">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            )

            if (!sidebarOpen) {
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{navItem}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return navItem
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-sidebar-border space-y-2">
          {/* Integration indicators */}
          {sidebarOpen && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 cursor-pointer rounded-md hover:bg-sidebar-accent transition-colors"
              onClick={() => navigate('/settings')}
            >
              <span className="text-[10px] text-sidebar-muted-foreground uppercase tracking-wider flex-1">Integrações</span>
              <div className="flex gap-1.5">
                {integrations.map(i => (
                  <IntegrationDot key={i.key} configured={i.configured} label={i.label} />
                ))}
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {isDark ? (
              <><Sun className="h-4 w-4 shrink-0" />{sidebarOpen && <span className="flex-1 text-left truncate">Modo Claro</span>}</>
            ) : (
              <><Moon className="h-4 w-4 shrink-0" />{sidebarOpen && <span className="flex-1 text-left truncate">Modo Escuro</span>}</>
            )}
          </button>

          {/* Toggle */}
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-sidebar-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {sidebarOpen ? (
              <><ChevronLeft className="h-4 w-4 shrink-0" /><span className="flex-1 text-left truncate">Recolher</span></>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>

          {/* User */}
          <div
            className={cn('flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer hover:bg-sidebar-accent transition-colors', !sidebarOpen && 'justify-center')}
            onClick={() => navigate('/perfil')}
          >
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-xs bg-sidebar-primary/20 text-sidebar-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground truncate">{userEmail}</p>
              </div>
            )}
            {sidebarOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-sidebar-muted-foreground hover:text-sidebar-foreground"
                onClick={(e) => { e.stopPropagation(); handleLogout() }}
              >
                <LogOut className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
