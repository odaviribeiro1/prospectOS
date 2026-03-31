import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Public endpoint — no JWT auth. Uses service role key.
Deno.serve(async (req) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') return new Response('ok', { headers })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const payload = await req.json()
    const { type, data } = payload

    const resendId = data?.email_id
    const entityRefId = data?.headers?.['X-Entity-Ref-ID'] ?? data?.tags?.['X-Entity-Ref-ID']

    if (!resendId && !entityRefId) {
      return new Response(JSON.stringify({ ok: true }), { headers })
    }

    let query = supabase.from('email_sends').select('id, campaign_id, opened_count, opened_at')
    if (entityRefId) {
      query = query.eq('id', entityRefId)
    } else {
      query = query.eq('resend_id', resendId)
    }

    const { data: sends } = await query.limit(1)
    if (!sends || sends.length === 0) {
      return new Response(JSON.stringify({ ok: true }), { headers })
    }

    const send = sends[0]
    const now = new Date().toISOString()
    const updates: Record<string, unknown> = {}

    switch (type) {
      case 'email.sent':
        updates.status = 'sent'
        updates.sent_at = data.created_at || now
        break
      case 'email.delivered':
        updates.status = 'delivered'
        updates.delivered_at = data.created_at || now
        break
      case 'email.opened':
        updates.status = 'opened'
        if (!send.opened_at) updates.opened_at = data.created_at || now
        updates.opened_count = (send.opened_count || 0) + 1
        break
      case 'email.clicked':
        updates.status = 'clicked'
        updates.clicked_at = data.created_at || now
        break
      case 'email.bounced':
        updates.status = 'bounced'
        updates.bounced_at = data.created_at || now
        updates.bounce_type = data.bounce?.type || null
        break
      case 'email.complained':
        updates.status = 'complained'
        updates.complained_at = data.created_at || now
        break
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('email_sends').update(updates).eq('id', send.id)

      if (send.campaign_id) {
        const { data: allSends } = await supabase
          .from('email_sends')
          .select('status')
          .eq('campaign_id', send.campaign_id)

        if (allSends) {
          const sentCount = allSends.filter(s =>
            ['sent', 'delivered', 'opened', 'clicked'].includes(s.status)
          ).length
          const deliveredCount = allSends.filter(s =>
            ['delivered', 'opened', 'clicked'].includes(s.status)
          ).length
          const openedCount = allSends.filter(s =>
            ['opened', 'clicked'].includes(s.status)
          ).length
          const bouncedCount = allSends.filter(s => s.status === 'bounced').length
          const complainedCount = allSends.filter(s => s.status === 'complained').length

          await supabase
            .from('email_campaigns')
            .update({ sent_count: sentCount, delivered_count: deliveredCount, opened_count: openedCount, bounced_count: bouncedCount, complained_count: complainedCount })
            .eq('id', send.campaign_id)
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers })
  } catch (err) {
    console.error('resend-webhook error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers })
  }
})
