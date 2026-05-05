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
      return json({ error: 'Apenas o owner pode revogar convites' }, 403)
    }

    const { invite_id } = (await req.json().catch(() => ({}))) as { invite_id?: string }
    if (!invite_id) return json({ error: 'invite_id é obrigatório' }, 400)

    const { data: invite, error: fetchErr } = await supabase
      .from('invites')
      .select('id, used_at, revoked_at')
      .eq('id', invite_id)
      .single()

    if (fetchErr || !invite) return json({ error: 'Convite não encontrado' }, 404)
    if (invite.used_at) return json({ error: 'Convite já foi utilizado' }, 400)
    if (invite.revoked_at) return json({ error: 'Convite já foi revogado' }, 400)

    const { error: updateErr } = await supabase
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invite_id)

    if (updateErr) return json({ error: updateErr.message }, 500)

    return json({ ok: true })
  } catch (err) {
    console.error('revoke-invite error:', err)
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500)
  }
})
