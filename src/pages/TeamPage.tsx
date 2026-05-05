import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Loader2, UserPlus, Copy, Trash2, ShieldAlert } from 'lucide-react'
import { useProfile } from '../hooks/useProfile'
import { useTeam, usePendingInvites, useCreateInvite, useRevokeInvite } from '../hooks/useInvites'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'

export function TeamPage() {
  const { profile, isLoading: profileLoading, isOwner } = useProfile()
  const { data: members, isLoading: teamLoading } = useTeam()
  const { data: invites, isLoading: invitesLoading } = usePendingInvites()
  const createInvite = useCreateInvite()
  const revokeInvite = useRevokeInvite()
  const [email, setEmail] = useState('')

  if (profileLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!profile) return <Navigate to="/login" replace />

  if (!isOwner) {
    return (
      <div className="p-6">
        <Card className="border-amber-400/30 bg-amber-400/5">
          <CardContent className="flex items-center gap-3 py-6">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            <p className="text-sm text-foreground">
              Apenas o owner desta instância pode gerenciar a equipe.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    try {
      const result = await createInvite.mutateAsync(email.trim())
      setEmail('')
      if (result.email_sent) {
        toast.success('Convite criado e e-mail enviado.')
      } else {
        toast.success('Convite criado. Copie o link abaixo para compartilhar.')
        await navigator.clipboard.writeText(result.invite_url).catch(() => {})
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar convite')
    }
  }

  async function copyInviteUrl(token: string) {
    const url = `${window.location.origin}/invite?token=${token}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copiado.')
  }

  async function handleRevoke(invite_id: string) {
    if (!confirm('Revogar este convite? O link deixará de funcionar.')) return
    try {
      await revokeInvite.mutateAsync(invite_id)
      toast.success('Convite revogado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao revogar convite')
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Equipe</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie quem tem acesso a esta instância. Apenas o owner pode convidar novos membros.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Convidar novo membro</CardTitle>
          <CardDescription>
            Envia um link de convite válido por 7 dias. Se Resend estiver configurado, o e-mail é enviado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="invite-email" className="sr-only">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={createInvite.isPending}>
              {createInvite.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
              ) : (
                <><UserPlus className="h-4 w-4" />Convidar</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Convites pendentes</CardTitle>
          <CardDescription>Convites criados que ainda não foram aceitos.</CardDescription>
        </CardHeader>
        <CardContent>
          {invitesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !invites || invites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum convite pendente.</p>
          ) : (
            <div className="space-y-2">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')} · role: {invite.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => copyInviteUrl(invite.token)}>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={revokeInvite.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revogar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Membros da instância</CardTitle>
          <CardDescription>Usuários que já estão dentro.</CardDescription>
        </CardHeader>
        <CardContent>
          {teamLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !members || members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum membro encontrado.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {m.display_name ?? m.id.slice(0, 8) + '...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Entrou em {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span
                    className={
                      m.role === 'owner' || m.role === 'gestor'
                        ? 'text-xs px-2 py-1 rounded-md bg-primary/15 text-primary'
                        : 'text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground'
                    }
                  >
                    {m.role === 'owner' || m.role === 'gestor' ? 'owner' : 'member'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
