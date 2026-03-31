import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') || '' }
}

function formatTitle(num: number): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = String(now.getFullYear()).slice(-2)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `#${num} Leads Enriquecidos - ${day}/${month}/${year} ${hours}:${minutes}`
}

async function apolloPersonMatch(
  apolloKey: string,
  firstName: string,
  lastName: string,
  organizationName: string,
  domain?: string
): Promise<Record<string, unknown> | null> {
  const body: Record<string, unknown> = {
    api_key: apolloKey,
    first_name: firstName,
    last_name: lastName,
    organization_name: organizationName,
  }
  if (domain) body.domain = domain

  const res = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.person ?? null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const { company_ids, test } = body

    // Buscar configurações
    const { data: settings, error: settingsErr } = await supabase
      .from('settings')
      .select('apollo_api_key')
      .eq('user_id', user.id)
      .single()

    if (settingsErr || !settings?.apollo_api_key) {
      return new Response(JSON.stringify({ error: 'API key do Apollo não configurada' }), { status: 400, headers: corsHeaders })
    }

    // Testar conexão
    if (test) {
      const testRes = await fetch('https://api.apollo.io/api/v1/auth/health', {
        headers: { 'Cache-Control': 'no-cache', 'X-Api-Key': settings.apollo_api_key },
      })
      if (!testRes.ok) {
        return new Response(JSON.stringify({ error: `Apollo retornou: ${testRes.status}` }), { headers: corsHeaders })
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    if (!company_ids || !Array.isArray(company_ids) || company_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'company_ids é obrigatório' }), { status: 400, headers: corsHeaders })
    }

    // Buscar sócios das empresas selecionadas
    const { data: partners, error: partnersErr } = await supabase
      .from('partners')
      .select('*, company:companies(id, razao_social, nome_fantasia, website)')
      .in('company_id', company_ids)
      .eq('user_id', user.id)

    if (partnersErr) throw partnersErr

    // Obter próximo número sequencial
    const { data: seqData, error: seqErr } = await supabase
      .rpc('next_list_sequential_number', { p_user_id: user.id })

    if (seqErr) throw seqErr
    const sequentialNumber = seqData as number
    const title = formatTitle(sequentialNumber)

    // Criar a lista
    const firstCompanyId = company_ids[0]
    const { data: listData, error: listErr } = await supabase
      .from('lead_lists')
      .insert({
        user_id: user.id,
        batch_id: null,
        sequential_number: sequentialNumber,
        title,
        total_leads: 0,
        status: 'pending_review',
      })
      .select()
      .single()

    if (listErr) throw listErr

    let enrichedCount = 0
    let errorCount = 0
    const enrichedLeads: Record<string, unknown>[] = []

    // Enriquecer cada sócio via Apollo
    for (const partner of partners ?? []) {
      try {
        const { firstName, lastName } = splitName(partner.nome)
        const company = partner.company as { id: string; razao_social: string; nome_fantasia?: string; website?: string }
        const orgName = company?.nome_fantasia || company?.razao_social || ''

        // Extrair domain do website
        let domain: string | undefined
        if (company?.website) {
          try {
            domain = new URL(company.website).hostname.replace('www.', '')
          } catch {
            domain = undefined
          }
        }

        const apolloData = await apolloPersonMatch(
          settings.apollo_api_key,
          firstName,
          lastName,
          orgName,
          domain
        )

        const lead: Record<string, unknown> = {
          user_id: user.id,
          partner_id: partner.id,
          company_id: partner.company_id,
          list_id: listData.id,
          nome: partner.nome,
          status: 'pending_review',
        }

        if (apolloData) {
          // Mapear campos do Apollo
          const emails = (apolloData.email_status ? [{ email: apolloData.email, status: apolloData.email_status }] : (apolloData.emails as unknown[] ?? []))
          const primaryEmail = emails[0] as Record<string, unknown> | undefined

          lead.email = apolloData.email as string ?? null
          lead.email_type = apolloData.email_is_personal ? 'personal' : 'corporate'
          lead.email_status = apolloData.email_status as string ?? primaryEmail?.status ?? null
          lead.linkedin_url = apolloData.linkedin_url as string ?? null
          lead.cargo = apolloData.title as string ?? null
          lead.telefone = (apolloData.phone_numbers as Array<{ raw_number: string }>)?.[0]?.raw_number ?? null
          lead.empresa_nome = (apolloData.organization as Record<string, unknown>)?.name as string ?? orgName
          lead.empresa_domain = (apolloData.organization as Record<string, unknown>)?.website_url as string ?? domain ?? null
          lead.apollo_raw = apolloData
          enrichedCount++
        }

        enrichedLeads.push(lead)
      } catch (err) {
        console.error(`Erro ao enriquecer parceiro ${partner.id}:`, err)
        errorCount++
        // Adicionar sem dados Apollo
        enrichedLeads.push({
          user_id: user.id,
          partner_id: partner.id,
          company_id: partner.company_id,
          list_id: listData.id,
          nome: partner.nome,
          status: 'pending_review',
        })
      }

      // Rate limit: 1 request por segundo
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Inserir todos os leads
    if (enrichedLeads.length > 0) {
      const { error: leadsErr } = await supabase
        .from('enriched_leads')
        .insert(enrichedLeads)

      if (leadsErr) throw leadsErr
    }

    // Atualizar contadores da lista
    const { error: updateErr } = await supabase
      .from('lead_lists')
      .update({ total_leads: enrichedLeads.length })
      .eq('id', listData.id)

    if (updateErr) throw updateErr

    return new Response(JSON.stringify({
      list_id: listData.id,
      title,
      total: (partners ?? []).length,
      enriched_count: enrichedCount,
      errors: errorCount,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('apollo-enrich error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
