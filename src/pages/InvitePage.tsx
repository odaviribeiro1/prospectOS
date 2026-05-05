import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Target, Loader2, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'

interface InviteData {
  email: string
  role: string
  expires_at: string
}

export function InvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorMsg('Token de convite ausente na URL.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token })

      if (error) {
        setErrorMsg('Falha ao validar convite.')
      } else if (!data || data.length === 0) {
        setErrorMsg('Convite inválido, expirado ou já utilizado.')
      } else {
        setInvite(data[0] as InviteData)
      }
      setLoading(false)
    }
    load()
  }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invite || !token) return
    if (password.length < 8) {
      toast.error('Senha precisa ter no mínimo 8 caracteres.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: { data: { invite_token: token } },
    })

    if (error) {
      setSubmitting(false)
      toast.error(error.message)
      return
    }

    toast.success('Conta criada com sucesso! Faça login para continuar.')
    navigate('/login')
  }

  return (
    <div className="min-h-screen dot-grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/20 mb-3 primary-glow">
            <Target className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">Agentise Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Aceite seu convite</p>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Criar conta via convite</CardTitle>
            <CardDescription>
              Defina sua senha para entrar na instância.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : errorMsg ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <ShieldAlert className="h-8 w-8 text-amber-400" />
                <p className="text-sm text-center text-foreground">{errorMsg}</p>
                <Link to="/login" className="text-xs text-primary hover:underline">
                  Voltar para login
                </Link>
              </div>
            ) : invite ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={invite.email} disabled readOnly />
                  <p className="text-xs text-muted-foreground">
                    Definido pelo convite e não pode ser alterado.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Criando conta...</>
                  ) : (
                    'Aceitar convite e criar conta'
                  )}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
