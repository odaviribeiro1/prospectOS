import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FollowUpEnrollment, PendingFollowUp } from '../types'

export function useEnrollments(sequenceId: string | undefined) {
  return useQuery({
    queryKey: ['enrollments', sequenceId],
    queryFn: async () => {
      if (!sequenceId) return []
      const { data, error } = await supabase
        .from('follow_up_enrollments')
        .select('*, lead:enriched_leads(id, nome, email, cargo, empresa_nome), sequence:follow_up_sequences(id, name)')
        .eq('sequence_id', sequenceId)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data as FollowUpEnrollment[]
    },
    enabled: !!sequenceId,
  })
}

export function usePendingFollowUps() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('pending-followups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_up_enrollments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['pending-followups'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return useQuery({
    queryKey: ['pending-followups'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('follow_up_enrollments')
        .select(`
          *,
          lead:enriched_leads(id, nome, email, cargo, empresa_nome),
          sequence:follow_up_sequences(id, name),
          step:follow_up_steps!inner(*)
        `)
        .eq('status', 'active')
        .lte('next_step_due_at', now)
        .not('next_step_due_at', 'is', null)
        .order('next_step_due_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as PendingFollowUp[]
    },
    refetchInterval: 60_000,
  })
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['pending-count'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { count, error } = await supabase
        .from('follow_up_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('next_step_due_at', now)
        .not('next_step_due_at', 'is', null)
      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 60_000,
  })
}

export function useEnrollLeads() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sequenceId,
      leadIds,
      campaignId,
    }: {
      sequenceId: string
      leadIds: string[]
      campaignId?: string
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Get first step for initial due date calculation
      const { data: steps, error: stepsError } = await supabase
        .from('follow_up_steps')
        .select('id, delay_value, delay_unit')
        .eq('sequence_id', sequenceId)
        .order('step_number', { ascending: true })
        .limit(1)
      if (stepsError) throw stepsError

      const now = new Date()
      let nextDue: string | null = null
      if (steps && steps.length > 0) {
        const { delay_value, delay_unit } = steps[0]
        const ms = delay_unit === 'hours'
          ? delay_value * 3600000
          : delay_value * 86400000
        nextDue = new Date(now.getTime() + ms).toISOString()
      }

      const rows = leadIds.map(lead_id => ({
        sequence_id: sequenceId,
        lead_id,
        user_id: user.id,
        campaign_id: campaignId ?? null,
        current_step: 1,
        status: 'active',
        next_step_due_at: nextDue,
        enrolled_at: now.toISOString(),
      }))

      const { data, error } = await supabase
        .from('follow_up_enrollments')
        .upsert(rows, { onConflict: 'sequence_id,lead_id', ignoreDuplicates: true })
        .select()
      if (error) throw error
      return data as FollowUpEnrollment[]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] })
      queryClient.invalidateQueries({ queryKey: ['pending-count'] })
    },
  })
}

export function useRemoveEnrollment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ enrollmentId, reason }: { enrollmentId: string; reason?: string }) => {
      const { error } = await supabase
        .from('follow_up_enrollments')
        .update({
          status: 'removed',
          removed_at: new Date().toISOString(),
          removal_reason: reason ?? 'manual',
        })
        .eq('id', enrollmentId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      queryClient.invalidateQueries({ queryKey: ['pending-followups'] })
      queryClient.invalidateQueries({ queryKey: ['pending-count'] })
    },
  })
}
