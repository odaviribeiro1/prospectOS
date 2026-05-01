import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value)
  }
  return result
}

async function createOrGetChatwootContact(
  chatwootUrl: string,
  chatwootToken: string,
  accountId: number,
  lead: Record<string, unknown>,
  campaignId: string
): Promise<number | null> {
  try {
    const email = lead.email as string
    const searchRes = await fetch(
      `${chatwootUrl}/api/v1/accounts/${accountId}/contacts/search?q=${encodeURIComponent(email)}&include_contacts=true`,
      { headers: { api_access_token: chatwootToken } }
    )
    if (searchRes.ok) {
      const d = await searchRes.json()
      const contacts = d.payload?.contacts ?? d.payload ?? []
      if (Array.isArray(contacts) && contacts.length > 0) return contacts[0].id
    }
    const createRes = await fetch(`${chatwootUrl}/api/v1/accounts/${accountId}/contacts`, {
      method: 'POST',
      headers: { api_access_token: chatwootToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: lead.nome,
        email,
        phone_number: lead.telefone || undefined,
        custom_attributes: {
          source: 'agentise_leads',
          lead_id: lead.id,
          campaign_id: campaignId,
          empresa: lead.empresa_nome || '',
          cargo: lead.cargo || '',
          linkedin: lead.linkedin_url || '',
        },
      }),
    })
    if (createRes.ok) {
      const d = await createRes.json()
      return d.id ?? null
    }
  } catch (err) {
    console.error('Chatwoot contact error:', err)
  }
  return null
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

    const body = await req.json()
    const { campaign_id, test } = body

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL')
    const resendFromName = Deno.env.get('RESEND_FROM_NAME')
    const whatsappLink = Deno.env.get('WHATSAPP_LINK') ?? ''
    const chatwootUrl = Deno.env.get('CHATWOOT_URL')
    const chatwootApiToken = Deno.env.get('CHATWOOT_API_TOKEN')
    const chatwootAccountIdRaw = Deno.env.get('CHATWOOT_ACCOUNT_ID')
    const chatwootAccountId = chatwootAccountIdRaw ? Number(chatwootAccountIdRaw) : null

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY não configurada nas variáveis de ambiente da Edge Function' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Test mode
    if (test) {
      const testRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${resendFromName || 'Agentise Leads'} <${resendFromEmail || 'onboarding@resend.dev'}>`,
          to: [user.email!],
          subject: 'Agentise Leads — Conexão Resend OK',
          html: '<p>Se você está lendo este e-mail, a integração com Resend está funcionando corretamente.</p>',
        }),
      })
      if (!testRes.ok) {
        const errData = await testRes.json().catch(() => ({}))
        return new Response(
          JSON.stringify({ error: errData.message || `Resend retornou: ${testRes.status}` }),
          { headers: corsHeaders }
        )
      }
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
    }

    if (!campaign_id) {
      return new Response(JSON.stringify({ error: 'campaign_id é obrigatório' }), { status: 400, headers: corsHeaders })
    }

    const { data: campaign, error: campaignErr } = await supabase
      .from('email_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campanha não encontrada' }), { status: 404, headers: corsHeaders })
    }
    if (campaign.status !== 'draft') {
      return new Response(JSON.stringify({ error: 'Campanha não está em rascunho' }), { status: 400, headers: corsHeaders })
    }

    const { data: leads, error: leadsErr } = await supabase
      .from('enriched_leads')
      .select('*')
      .eq('list_id', campaign.list_id)
      .eq('status', 'approved')
      .not('email', 'is', null)
      .eq('user_id', user.id)

    if (leadsErr) throw leadsErr
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhum lead aprovado com e-mail na lista' }),
        { status: 400, headers: corsHeaders }
      )
    }

    await supabase
      .from('email_campaigns')
      .update({ status: 'sending', sent_at: new Date().toISOString(), total_recipients: leads.length })
      .eq('id', campaign_id)

    const hasChatwoot = !!(chatwootUrl && chatwootApiToken && chatwootAccountId)
    let sentCount = 0
    let failedCount = 0

    for (const lead of leads) {
      try {
        const firstName = (lead.nome as string).split(' ')[0]
        const vars: Record<string, string> = {
          nome: firstName,
          nome_completo: lead.nome as string,
          empresa: (lead.empresa_nome as string) || '',
          cargo: (lead.cargo as string) || '',
          email: (lead.email as string) || '',
          link_whatsapp: campaign.whatsapp_link || whatsappLink,
        }

        const subjectRendered = renderTemplate(campaign.subject, vars)
        const bodyRendered = renderTemplate(campaign.body_template, vars)

        const { data: sendRecord, error: sendErr } = await supabase
          .from('email_sends')
          .insert({
            user_id: user.id,
            campaign_id,
            lead_id: lead.id,
            to_email: lead.email,
            to_name: lead.nome,
            subject_rendered: subjectRendered,
            body_rendered: bodyRendered,
            status: 'queued',
          })
          .select()
          .single()

        if (sendErr) throw sendErr

        const sendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `${campaign.from_name || resendFromName || 'Agentise Leads'} <${campaign.from_email || resendFromEmail || 'onboarding@resend.dev'}>`,
            to: [lead.email],
            subject: subjectRendered,
            html: bodyRendered,
            headers: { 'X-Entity-Ref-ID': sendRecord.id },
          }),
        })

        if (sendRes.ok) {
          const sendData = await sendRes.json()
          await supabase
            .from('email_sends')
            .update({ resend_id: sendData.id, status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', sendRecord.id)
          await supabase
            .from('enriched_leads')
            .update({ status: 'contacted' })
            .eq('id', lead.id)

          if (hasChatwoot) {
            const contactId = await createOrGetChatwootContact(
              chatwootUrl!,
              chatwootApiToken!,
              chatwootAccountId!,
              lead,
              campaign_id
            )
            if (contactId) {
              await supabase
                .from('enriched_leads')
                .update({ chatwoot_contact_id: contactId })
                .eq('id', lead.id)
            }
          }
          sentCount++
        } else {
          const errData = await sendRes.json().catch(() => ({}))
          await supabase
            .from('email_sends')
            .update({ status: 'failed', error_message: errData.message || `HTTP ${sendRes.status}` })
            .eq('id', sendRecord.id)
          failedCount++
        }
      } catch (err) {
        console.error(`Error sending to lead ${lead.id}:`, err)
        failedCount++
      }

      await new Promise(r => setTimeout(r, 600))
    }

    await supabase
      .from('email_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString(), sent_count: sentCount })
      .eq('id', campaign_id)

    await supabase
      .from('lead_lists')
      .update({ status: 'in_campaign' })
      .eq('id', campaign.list_id)

    return new Response(
      JSON.stringify({ total: leads.length, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('resend-send error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
