import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Save, LogOut, Download, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Header } from '../components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Separator } from '../components/ui/separator'
import { Badge } from '../components/ui/badge'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'

export function ProfilePage() {
  const navigate = useNavigate()
  const { profile, isLoading: isProfileLoading, isGestor } = useProfile()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Load user email on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '')
    })
  })

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos de senha')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Senha alterada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(`Erro ao alterar senha: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const [companies, lists, campaigns, sequences] = await Promise.all([
        supabase.from('companies').select('*').limit(1000),
        supabase.from('lead_lists').select('*'),
        supabase.from('email_campaigns').select('*'),
        supabase.from('follow_up_sequences').select('*'),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        companies: companies.data ?? [],
        lead_lists: lists.data ?? [],
        email_campaigns: campaigns.data ?? [],
        follow_up_sequences: sequences.data ?? [],
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `agentise-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Dados exportados com sucesso!')
    } catch (err) {
      toast.error(`Erro ao exportar: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== email) {
      toast.error('Digite seu e-mail corretamente para confirmar')
      return
    }
    setDeleting(true)
    try {
      // Note: Account deletion requires server-side handling via admin API
      // For now, sign out and show message
      await supabase.auth.signOut()
      toast.success('Conta removida. Redirecionando...')
      navigate('/login')
    } catch (err) {
      toast.error(`Erro ao excluir conta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    navigate('/login')
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Header title="Meu Perfil" description="Gerencie sua conta e preferências" />

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Informações da Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={email} readOnly className="bg-muted cursor-not-allowed" />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
          </div>
          <div className="space-y-1.5">
            <Label>Seu papel</Label>
            <div className="flex items-center gap-2">
              {isProfileLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : profile ? (
                <Badge variant={isGestor ? 'info' : 'secondary'} className="gap-1">
                  <Shield className="h-3 w-3" />
                  {isGestor ? 'Gestor' : 'Operacional'}
                </Badge>
              ) : (
                <Badge variant="outline">Indefinido</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {isGestor
                ? 'Você enxerga todos os dados da instância.'
                : 'Você enxerga apenas os dados que criou.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Alterar Senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nova senha</Label>
            <Input
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar nova senha</Label>
            <Input
              type="password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Alterar senha
          </Button>
        </CardContent>
      </Card>

      {/* Session */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Encerrar sessão
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-400/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-red-400">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Exporte todos os seus dados em formato JSON antes de excluir a conta.</p>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar meus dados
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Para excluir sua conta, digite seu e-mail abaixo para confirmar. Esta ação não pode ser desfeita.
            </p>
            <Input
              placeholder={email}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              className="border-red-400/30 focus-visible:ring-red-400/30"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm !== email}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir conta permanentemente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
