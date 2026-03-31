import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { EmailSend } from '../types'

export function useEmailSends(campaignId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!campaignId) return

    const channel = supabase
      .channel(`email-sends-${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'email_sends', filter: `campaign_id=eq.${campaignId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['email-sends', campaignId] })
          queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [campaignId, queryClient])

  return useQuery({
    queryKey: ['email-sends', campaignId],
    queryFn: async () => {
      if (!campaignId) return []
      const { data, error } = await supabase
        .from('email_sends')
        .select('*, lead:enriched_leads(id, nome, email, cargo, empresa_nome)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as EmailSend[]
    },
    enabled: !!campaignId,
  })
}
