import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: corsHeaders })
    }

    const chatwootUrl = Deno.env.get('CHATWOOT_URL')
    const chatwootApiToken = Deno.env.get('CHATWOOT_API_TOKEN')

    if (!chatwootUrl || !chatwootApiToken) {
      return new Response(
        JSON.stringify({ error: 'CHATWOOT_URL e CHATWOOT_API_TOKEN não configurados nas variáveis de ambiente da Edge Function' }),
        { status: 500, headers: corsHeaders }
      )
    }

    const profileRes = await fetch(`${chatwootUrl}/api/v1/profile`, {
      headers: { api_access_token: chatwootApiToken },
    })

    if (!profileRes.ok) {
      return new Response(
        JSON.stringify({ error: `Chatwoot retornou: ${profileRes.status}` }),
        { headers: corsHeaders }
      )
    }

    const profile = await profileRes.json()
    const agentName = profile.name || profile.display_name || 'Agente'

    return new Response(
      JSON.stringify({ ok: true, agent_name: agentName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('chatwoot-test error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
