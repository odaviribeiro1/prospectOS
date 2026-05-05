import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendInviteEmail(resendKey: string, fromEmail: string, fromName: string, to: string, inviteUrl: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${fromName || 'Agentise Leads'} <${fromEmail}>`,
      to,
      subject: 'Você foi convidado para o Agentise Leads',
      html: `
        <p>Você foi convidado para esta instância do Agentise Leads.</p>
        <p>Acesse o link abaixo para criar sua conta. O convite é válido por 7 dias:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        <p style="color:#888;font-size:12px;margin-top:24px">Se você não esperava este convite, ignore este e-mail.</p>
      `,
    }),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autorizado' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return json({ error: 'Sessão inválida' }, 401)

    const { data: caller } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!caller || caller.role !== 'owner') {
      return json({ error: 'Apenas o owner pode criar convites' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const { email, role = 'member' } = body as { email?: string; role?: string }

    if (!email || typeof email !== 'string') {
      return json({ error: 'E-mail é obrigatório' }, 400)
    }
    if (!['member'].includes(role)) {
      return json({ error: "Role inválido. Convites só permitem 'member'." }, 400)
    }

    const inviteToken = generateToken()
    const normalizedEmail = email.toLowerCase().trim()

    const { data: invite, error: insertErr } = await supabase
      .from('invites')
      .insert({
        email: normalizedEmail,
        token: inviteToken,
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertErr || !invite) {
      return json({ error: insertErr?.message ?? 'Falha ao criar convite' }, 500)
    }

    const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '')
    const inviteUrl = `${appUrl}/invite?token=${inviteToken}`

    const resendKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    const fromName = Deno.env.get('RESEND_FROM_NAME') ?? 'Agentise Leads'
    let emailSent = false

    if (resendKey && fromEmail) {
      try {
        await sendInviteEmail(resendKey, fromEmail, fromName, normalizedEmail, inviteUrl)
        emailSent = true
      } catch (e) {
        console.error('create-invite: falha ao enviar e-mail:', e)
      }
    }

    return json({
      ok: true,
      invite_id: invite.id,
      invite_url: inviteUrl,
      expires_at: invite.expires_at,
      email_sent: emailSent,
    })
  } catch (err) {
    console.error('create-invite error:', err)
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500)
  }
})
