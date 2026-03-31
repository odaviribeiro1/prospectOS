import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FollowUpSequence, FollowUpStep, DelayUnit, StepCondition } from '../types'

// ---- Sequences -----------------------------------------------

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follow_up_sequences')
        .select('*, steps:follow_up_steps(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as FollowUpSequence[]
    },
  })
}

export function useSequence(id: string | undefined) {
  return useQuery({
    queryKey: ['sequence', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('follow_up_sequences')
        .select('*, steps:follow_up_steps(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as FollowUpSequence
    },
    enabled: !!id,
  })
}

export interface SequenceForm {
  name: string
  description?: string
  is_active: boolean
}

export function useCreateSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: SequenceForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { data, error } = await supabase
        .from('follow_up_sequences')
        .insert({ ...values, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data as FollowUpSequence
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequences'] }),
  })
}

export function useUpdateSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<SequenceForm> }) => {
      const { data, error } = await supabase
        .from('follow_up_sequences')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as FollowUpSequence
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
      queryClient.invalidateQueries({ queryKey: ['sequence', id] })
    },
  })
}

export function useDeleteSequence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('follow_up_sequences').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequences'] }),
  })
}

// ---- Steps ---------------------------------------------------

export interface StepForm {
  step_number: number
  name: string
  condition: StepCondition
  delay_value: number
  delay_unit: DelayUnit
  subject: string
  body_template: string
}

export function useUpsertSteps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sequenceId, steps }: { sequenceId: string; steps: StepForm[] }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      // Delete existing steps and replace
      const { error: delError } = await supabase
        .from('follow_up_steps')
        .delete()
        .eq('sequence_id', sequenceId)
      if (delError) throw delError

      if (steps.length === 0) return []

      const rows = steps.map(s => ({ ...s, sequence_id: sequenceId, user_id: user.id }))
      const { data, error } = await supabase
        .from('follow_up_steps')
        .insert(rows)
        .select()
      if (error) throw error
      return data as FollowUpStep[]
    },
    onSuccess: (_, { sequenceId }) => {
      queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] })
      queryClient.invalidateQueries({ queryKey: ['sequences'] })
    },
  })
}
