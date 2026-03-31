import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: corsHeaders })
    }

    const body = await req.json()
    const { cnpj, test } = body

    // Buscar API key do usuário
    const { data: settings, error: settingsErr } = await supabase
      .from('settings')
      .select('cnpja_api_key')
      .eq('user_id', user.id)
      .single()

    if (settingsErr || !settings?.cnpja_api_key) {
      return new Response(JSON.stringify({ error: 'API key do CNPJá não configurada' }), { status: 400, headers: corsHeaders })
    }

    const cleanCnpj = cnpj.replace(/\D/g, '')

    // Testar conexão
    if (test) {
      const testRes = await fetch(`https://api.cnpja.com/office/${cleanCnpj}`, {
        headers: { 'Authorization': settings.cnpja_api_key },
      })
      if (!testRes.ok && testRes.status !== 404) {
        const err = await testRes.text()
        return new Response(JSON.stringify({ error: `CNPJá retornou: ${testRes.status} - ${err}` }), { headers: corsHeaders })
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    // Consultar CNPJ
    const response = await fetch(`https://api.cnpja.com/office/${cleanCnpj}`, {
      headers: { 'Authorization': settings.cnpja_api_key },
    })

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
    const rateLimitReset = response.headers.get('x-ratelimit-reset')

    if (response.status === 429) {
      return new Response(JSON.stringify({
        error: 'Rate limit atingido. Aguarde antes de continuar.',
        rate_limit_reset: rateLimitReset,
      }), { status: 429, headers: corsHeaders })
    }

    if (response.status === 404) {
      return new Response(JSON.stringify({
        error: `CNPJ ${cleanCnpj} não encontrado na base da Receita Federal`,
      }), { headers: corsHeaders })
    }

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: `Erro CNPJá: ${response.status} - ${errText}` }), { headers: corsHeaders })
    }

    const data = await response.json()

    // Mapear dados da CNPJá para o nosso modelo
    // Documentação: https://api.cnpja.com (campos podem variar por versão)
    const company = data.company ?? data

    // Regime tributário
    let regimeTributario = 'outros'
    const regimeRaw = (data.taxRegime ?? company.simei ?? company.regime ?? '').toString().toLowerCase()
    if (regimeRaw.includes('simples') || regimeRaw === 'simei') regimeTributario = 'simples'
    else if (regimeRaw.includes('presumido')) regimeTributario = 'lucro_presumido'
    else if (regimeRaw.includes('real')) regimeTributario = 'lucro_real'

    // Porte
    let porte = 'outros'
    const porteRaw = (company.size ?? company.porte ?? data.company?.size ?? '').toString().toUpperCase()
    if (porteRaw === 'ME' || porteRaw.includes('MICROEMPRESA')) porte = 'me'
    else if (porteRaw === 'EPP' || porteRaw.includes('PEQUENO PORTE')) porte = 'epp'
    else if (porteRaw === 'DEMAIS' || porteRaw.includes('MEDIO') || porteRaw.includes('MÉDIO')) porte = 'medio'
    else if (porteRaw.includes('GRANDE')) porte = 'grande'

    // Endereço
    const addr = data.address ?? data.endereco ?? {}
    const endereco = {
      logradouro: addr.street ?? addr.logradouro,
      numero: addr.number ?? addr.numero,
      complemento: addr.details ?? addr.complemento,
      bairro: addr.district ?? addr.bairro,
      municipio: addr.city ?? addr.municipio,
      uf: addr.state ?? addr.uf,
      cep: addr.zip ?? addr.cep,
    }

    // Sócios/parceiros
    const membros = data.members ?? data.socios ?? data.partners ?? []
    const partners = membros.map((m: Record<string, unknown>) => ({
      nome: m.name ?? m.nome ?? '',
      qualificacao: m.role?.description ?? m.qualificacao ?? m.role ?? null,
      cpf_masked: m.taxId ?? m.cpf_masked ?? null,
      data_entrada: m.since ?? m.data_entrada ?? null,
    }))

    // Telefones e e-mails
    const phones = data.phones ?? data.telefones ?? []
    const emails = data.emails ?? []
    const telefone = phones[0]?.number ?? phones[0]?.telefone ?? null
    const email = emails[0]?.address ?? emails[0]?.email ?? null

    // CNAE
    const mainActivity = data.mainActivity ?? data.cnae ?? data.atividade_principal ?? {}
    const cnae_principal = mainActivity.code ?? mainActivity.codigo ?? null
    const cnae_descricao = mainActivity.text ?? mainActivity.descricao ?? null

    const companyMapped = {
      cnpj: cleanCnpj,
      razao_social: company.name ?? data.razao_social ?? null,
      nome_fantasia: company.alias ?? data.nome_fantasia ?? null,
      regime_tributario: regimeTributario,
      porte,
      situacao_cadastral: data.status?.text ?? data.situacao_cadastral ?? null,
      cnae_principal,
      cnae_descricao,
      endereco,
      website: data.website ?? null,
      telefone,
      email,
      raw_data: data,
    }

    return new Response(JSON.stringify({
      company: companyMapped,
      partners,
      rate_limit_remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
      rate_limit_reset: rateLimitReset ? parseInt(rateLimitReset) : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('cnpja-lookup error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
