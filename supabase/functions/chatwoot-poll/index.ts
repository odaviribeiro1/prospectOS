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

    // This function is called either by pg_cron (no auth) or by the user (with auth)
    // In both cases we poll all active enrollments for all users
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id ?? null
    }

    // Get all users with Chatwoot configured
    const settingsQuery = supabase
      .from('settings')
      .select('user_id, chatwoot_url, chatwoot_api_token, chatwoot_account_id')
      .not('chatwoot_url', 'is', null)
      .not('chatwoot_api_token', 'is', null)
      .not('chatwoot_account_id', 'is', null)

    if (userId) settingsQuery.eq('user_id', userId)

    const { data: allSettings, error: settingsErr } = await settingsQuery
    if (settingsErr) throw settingsErr
    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma configuração Chatwoot encontrada', removed: 0 }), { headers: corsHeaders })
    }

    let totalRemoved = 0
    const pollResults: { user_id: string; checked: number; removed: number }[] = []

    for (const settings of allSettings) {
      const { user_id, chatwoot_url, chatwoot_api_token, chatwoot_account_id } = settings

      // Get active enrollments with Chatwoot contact IDs
      const { data: enrollments, error: enrollErr } = await supabase
        .from('follow_up_enrollments')
        .select('id, sequence_id, lead_id, lead:enriched_leads(id, nome, chatwoot_contact_id)')
        .eq('user_id', user_id)
        .eq('status', 'active')

      if (enrollErr || !enrollments || enrollments.length === 0) continue

      let removed = 0

      for (const enrollment of enrollments) {
        const lead = enrollment.lead as { id: string; nome: string; chatwoot_contact_id: number | null } | null
        if (!lead?.chatwoot_contact_id) continue

        // Check Chatwoot contact labels
        try {
          const labelRes = await fetch(
            `${chatwoot_url}/api/v1/accounts/${chatwoot_account_id}/contacts/${lead.chatwoot_contact_id}/labels`,
            {
              headers: {
                'api_access_token': chatwoot_api_token,
                'Content-Type': 'application/json',
              },
            }
          )

          if (!labelRes.ok) continue

          const labelData = await labelRes.json()
          const labels: string[] = labelData.payload ?? []

          if (labels.includes('resposta_negativa')) {
            // Remove enrollment
            await supabase.from('follow_up_enrollments').update({
              status: 'removed',
              removed_at: new Date().toISOString(),
              removal_reason: 'chatwoot_resposta_negativa',
              next_step_due_at: null,
            }).eq('id', enrollment.id)

            // Log activity
            await supabase.from('follow_up_activity_log').insert({
              sequence_id: enrollment.sequence_id,
              enrollment_id: enrollment.id,
              lead_id: lead.id,
              user_id,
              type: 'enrollment_removed',
              description: `${lead.nome} removido da sequência — label "resposta_negativa" detectada no Chatwoot`,
              metadata: { reason: 'chatwoot_resposta_negativa', chatwoot_contact_id: lead.chatwoot_contact_id },
            })

            removed++
            totalRemoved++
          }
        } catch (err) {
          console.error(`Erro ao verificar contato Chatwoot ${lead.chatwoot_contact_id}:`, err)
        }
      }

      // Log poll activity
      if (enrollments.length > 0) {
        // Get first active enrollment's sequence_id for logging
        const firstEnrollment = enrollments[0]
        await supabase.from('follow_up_activity_log').insert({
          sequence_id: firstEnrollment.sequence_id,
          user_id,
          type: 'chatwoot_poll',
          description: `Polling Chatwoot: ${enrollments.length} inscrições verificadas, ${removed} removidas`,
          metadata: { checked: enrollments.length, removed, timestamp: new Date().toISOString() },
        })
      }

      pollResults.push({ user_id, checked: enrollments.length, removed })
    }

    // Update last_chatwoot_poll timestamp in settings
    if (userId) {
      await supabase.from('settings')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return new Response(JSON.stringify({ success: true, total_removed: totalRemoved, results: pollResults }), { headers: corsHeaders })

  } catch (err) {
    console.error('chatwoot-poll error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), { status: 500, headers: corsHeaders })
  }
})
