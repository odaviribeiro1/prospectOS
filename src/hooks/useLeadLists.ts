import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { LeadList, EnrichedLead } from '../types'

export function useLeadLists() {
  return useQuery({
    queryKey: ['lead-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_lists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as LeadList[]
    },
  })
}

export function useLeadList(listId: string | undefined) {
  return useQuery({
    queryKey: ['lead-list', listId],
    queryFn: async () => {
      if (!listId) return null
      const { data, error } = await supabase
        .from('lead_lists')
        .select('*')
        .eq('id', listId)
        .single()

      if (error) throw error
      return data as LeadList
    },
    enabled: !!listId,
  })
}

export function useLeads(listId: string | undefined) {
  return useQuery({
    queryKey: ['leads', listId],
    queryFn: async () => {
      if (!listId) return []
      const { data, error } = await supabase
        .from('enriched_leads')
        .select('*, company:companies(id, razao_social, nome_fantasia, cnpj)')
        .eq('list_id', listId)
        .order('nome')

      if (error) throw error
      return data as EnrichedLead[]
    },
    enabled: !!listId,
  })
}

export function useReviewList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listId,
      approvedIds,
      rejectedIds,
    }: {
      listId: string
      approvedIds: string[]
      rejectedIds: string[]
    }) => {
      // Aprovar
      if (approvedIds.length > 0) {
        const { error } = await supabase
          .from('enriched_leads')
          .update({ status: 'approved' })
          .in('id', approvedIds)
        if (error) throw error
      }

      // Rejeitar
      if (rejectedIds.length > 0) {
        const { error } = await supabase
          .from('enriched_leads')
          .update({ status: 'rejected' })
          .in('id', rejectedIds)
        if (error) throw error
      }

      // Atualizar lista
      const { error } = await supabase
        .from('lead_lists')
        .update({
          status: 'reviewed',
          approved_leads: approvedIds.length,
          rejected_leads: rejectedIds.length,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', listId)
      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['lead-lists'] })
      queryClient.invalidateQueries({ queryKey: ['lead-list', listId] })
      queryClient.invalidateQueries({ queryKey: ['leads', listId] })
    },
  })
}
