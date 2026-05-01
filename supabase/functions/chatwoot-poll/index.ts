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

    // Single-instance: configuração vem das env vars da Edge Function.
    // Esta função pode ser invocada por pg_cron (sem auth) ou pelo usuário (com auth).
    // Em ambos os casos, varre todos os enrollments ativos da instância.
    const chatwootUrl = Deno.env.get('CHATWOOT_URL')
    const chatwootApiToken = Deno.env.get('CHATWOOT_API_TOKEN')
    const chatwootAccountIdRaw = Deno.env.get('CHATWOOT_ACCOUNT_ID')
    const chatwootAccountId = chatwootAccountIdRaw ? Number(chatwootAccountIdRaw) : null

    if (!chatwootUrl || !chatwootApiToken || !chatwootAccountId) {
      return new Response(
        JSON.stringify({
          error: 'CHATWOOT_URL, CHATWOOT_API_TOKEN e CHATWOOT_ACCOUNT_ID são obrigatórios nas variáveis de ambiente da Edge Function',
        }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Buscar todos os enrollments ativos da instância (sem agrupar por user)
    const { data: enrollments, error: enrollErr } = await supabase
      .from('follow_up_enrollments')
      .select('id, sequence_id, lead_id, user_id, lead:enriched_leads(id, nome, chatwoot_contact_id)')
      .eq('status', 'active')

    if (enrollErr) throw enrollErr
    if (!enrollments || enrollments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, total_removed: 0, checked: 0, message: 'Nenhuma inscrição ativa' }),
        { headers: corsHeaders }
      )
    }

    let totalRemoved = 0
    let totalChecked = 0

    for (const enrollment of enrollments) {
      const lead = enrollment.lead as { id: string; nome: string; chatwoot_contact_id: number | null } | null
      if (!lead?.chatwoot_contact_id) continue

      totalChecked++

      try {
        const labelRes = await fetch(
          `${chatwootUrl}/api/v1/accounts/${chatwootAccountId}/contacts/${lead.chatwoot_contact_id}/labels`,
          {
            headers: {
              'api_access_token': chatwootApiToken,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!labelRes.ok) continue

        const labelData = await labelRes.json()
        const labels: string[] = labelData.payload ?? []

        if (labels.includes('resposta_negativa')) {
          await supabase.from('follow_up_enrollments').update({
            status: 'removed',
            removed_at: new Date().toISOString(),
            removal_reason: 'chatwoot_resposta_negativa',
            next_step_due_at: null,
          }).eq('id', enrollment.id)

          await supabase.from('follow_up_activity_log').insert({
            sequence_id: enrollment.sequence_id,
            enrollment_id: enrollment.id,
            lead_id: lead.id,
            user_id: enrollment.user_id,
            type: 'enrollment_removed',
            description: `${lead.nome} removido da sequência — label "resposta_negativa" detectada no Chatwoot`,
            metadata: { reason: 'chatwoot_resposta_negativa', chatwoot_contact_id: lead.chatwoot_contact_id },
          })

          totalRemoved++
        }
      } catch (err) {
        console.error(`Erro ao verificar contato Chatwoot ${lead.chatwoot_contact_id}:`, err)
      }
    }

    // Log único do polling, vinculado ao primeiro enrollment ativo
    const firstEnrollment = enrollments[0]
    if (firstEnrollment) {
      await supabase.from('follow_up_activity_log').insert({
        sequence_id: firstEnrollment.sequence_id,
        user_id: firstEnrollment.user_id,
        type: 'chatwoot_poll',
        description: `Polling Chatwoot: ${totalChecked} inscrições verificadas, ${totalRemoved} removidas`,
        metadata: { checked: totalChecked, removed: totalRemoved, timestamp: new Date().toISOString() },
      })
    }

    return new Response(
      JSON.stringify({ success: true, total_removed: totalRemoved, checked: totalChecked }),
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error('chatwoot-poll error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
