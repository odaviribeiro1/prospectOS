import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FollowUpActivityLogEntry } from '../types'

export function useActivityLog(sequenceId: string | undefined, limit = 50) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!sequenceId) return
    const channel = supabase
      .channel(`activity-log-${sequenceId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'follow_up_activity_log', filter: `sequence_id=eq.${sequenceId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['activity-log', sequenceId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sequenceId, queryClient])

  return useQuery({
    queryKey: ['activity-log', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return []
      const { data, error } = await supabase
        .from('follow_up_activity_log')
        .select('*, lead:enriched_leads(id, nome, empresa_nome)')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as FollowUpActivityLogEntry[]
    },
    enabled: !!sequenceId,
  })
}

export function useLeadTimeline(leadId: string | undefined) {
  return useQuery({
    queryKey: ['lead-timeline', leadId],
    queryFn: async () => {
      if (!leadId) return []
      const { data, error } = await supabase
        .from('follow_up_activity_log')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as FollowUpActivityLogEntry[]
    },
    enabled: !!leadId,
  })
}
