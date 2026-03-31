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

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { enrollment_id } = await req.json()
    if (!enrollment_id) return new Response(JSON.stringify({ error: 'enrollment_id obrigatório' }), { status: 400, headers: corsHeaders })

    // Load enrollment with step and lead
    const { data: enrollment, error: enrollErr } = await supabase
      .from('follow_up_enrollments')
      .select(`
        *,
        lead:enriched_leads(*),
        sequence:follow_up_sequences(id, name),
        step:follow_up_steps(*)
      `)
      .eq('id', enrollment_id)
      .eq('user_id', user.id)
      .single()

    if (enrollErr || !enrollment) return new Response(JSON.stringify({ error: 'Inscrição não encontrada' }), { status: 404, headers: corsHeaders })
    if (enrollment.status !== 'active') return new Response(JSON.stringify({ error: 'Inscrição não está ativa' }), { status: 400, headers: corsHeaders })

    const lead = enrollment.lead
    const steps: { id: string; step_number: number; delay_value: number; delay_unit: string; condition: string; subject: string; body_template: string }[] = enrollment.step
    const currentStep = steps.find((s: { step_number: number }) => s.step_number === enrollment.current_step)
    if (!currentStep) return new Response(JSON.stringify({ error: 'Passo não encontrado' }), { status: 404, headers: corsHeaders })

    // Load settings
    const { data: settings } = await supabase
      .from('settings')
      .select('resend_api_key, resend_from_email, resend_from_name, whatsapp_link, chatwoot_url, chatwoot_api_token, chatwoot_account_id')
      .eq('user_id', user.id)
      .single()

    if (!settings?.resend_api_key) return new Response(JSON.stringify({ error: 'Resend API key não configurada' }), { status: 400, headers: corsHeaders })

    // Check condition (no_reply / no_open)
    if (currentStep.condition !== 'always') {
      const { data: lastSend } = await supabase
        .from('follow_up_sends')
        .select('status, opened_at, replied_at')
        .eq('enrollment_id', enrollment_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastSend) {
        if (currentStep.condition === 'no_reply' && lastSend.replied_at) {
          // Lead replied — skip step, advance
          await advanceEnrollment(supabase, enrollment, steps, 'replied')
          return new Response(JSON.stringify({ skipped: true, reason: 'lead_replied' }), { headers: corsHeaders })
        }
        if (currentStep.condition === 'no_open' && lastSend.opened_at) {
          await advanceEnrollment(supabase, enrollment, steps, 'opened')
          return new Response(JSON.stringify({ skipped: true, reason: 'lead_opened' }), { headers: corsHeaders })
        }
      }
    }

    // Render template
    const firstName = lead.nome.split(' ')[0]
    const vars: Record<string, string> = {
      nome: firstName,
      nome_completo: lead.nome,
      empresa: lead.empresa_nome || '',
      cargo: lead.cargo || '',
      email: lead.email || '',
      link_whatsapp: settings.whatsapp_link || '',
    }
    const render = (t: string) => Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v), t)
    const subjectRendered = render(currentStep.subject)
    const bodyRendered = render(currentStep.body_template)

    // Send via Resend
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.resend_api_key}`,
      },
      body: JSON.stringify({
        from: `${settings.resend_from_name} <${settings.resend_from_email}>`,
        to: [`${lead.nome} <${lead.email}>`],
        subject: subjectRendered,
        html: bodyRendered,
        tags: [{ name: 'type', value: 'followup' }, { name: 'enrollment_id', value: enrollment_id }],
      }),
    })

    const sendData = await sendRes.json()
    if (!sendRes.ok) throw new Error(sendData.message || 'Erro ao enviar via Resend')

    // Insert follow_up_send record
    const { data: sendRecord } = await supabase
      .from('follow_up_sends')
      .insert({
        enrollment_id,
        step_id: currentStep.id,
        lead_id: lead.id,
        user_id: user.id,
        resend_id: sendData.id,
        to_email: lead.email,
        subject_rendered: subjectRendered,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single()

    // Log activity
    await supabase.from('follow_up_activity_log').insert({
      sequence_id: enrollment.sequence_id,
      enrollment_id,
      lead_id: lead.id,
      user_id: user.id,
      type: 'step_sent',
      description: `Passo ${currentStep.step_number}: "${currentStep.name}" enviado para ${lead.nome}`,
      metadata: { step_number: currentStep.step_number, resend_id: sendData.id },
    })

    // Advance enrollment
    await advanceEnrollment(supabase, enrollment, steps, 'sent')

    return new Response(JSON.stringify({ success: true, send_id: sendRecord?.id, resend_id: sendData.id }), { headers: corsHeaders })

  } catch (err) {
    console.error('follow-up-send error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Erro interno' }), { status: 500, headers: corsHeaders })
  }
})

async function advanceEnrollment(
  supabase: ReturnType<typeof createClient>,
  enrollment: { id: string; sequence_id: string; current_step: number; user_id: string },
  steps: { step_number: number; delay_value: number; delay_unit: string }[],
  reason: string
) {
  const nextStepNumber = enrollment.current_step + 1
  const nextStep = steps.find((s) => s.step_number === nextStepNumber)

  if (!nextStep) {
    // No more steps — complete enrollment
    await supabase.from('follow_up_enrollments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      next_step_due_at: null,
    }).eq('id', enrollment.id)

    await supabase.from('follow_up_activity_log').insert({
      sequence_id: enrollment.sequence_id,
      enrollment_id: enrollment.id,
      user_id: enrollment.user_id,
      type: 'enrollment_completed',
      description: 'Sequência concluída — todos os passos enviados',
      metadata: { reason },
    })
    return
  }

  const ms = nextStep.delay_unit === 'hours'
    ? nextStep.delay_value * 3600000
    : nextStep.delay_value * 86400000
  const nextDue = new Date(Date.now() + ms).toISOString()

  await supabase.from('follow_up_enrollments').update({
    current_step: nextStepNumber,
    next_step_due_at: nextDue,
  }).eq('id', enrollment.id)
}
