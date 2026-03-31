import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { EmailCampaign } from '../types'
import type { CampaignForm } from '../lib/validators'

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*, list:lead_lists(id, title, approved_leads)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EmailCampaign[]
    },
  })
}

export function useCampaign(id: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`campaign-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'email_campaigns', filter: `id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['campaign', id] })
        queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, queryClient])

  return useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*, list:lead_lists(id, title, approved_leads)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as EmailCampaign
    },
    enabled: !!id,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CampaignForm) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({ ...values, user_id: user.id, status: 'draft' })
        .select()
        .single()
      if (error) throw error
      return data as EmailCampaign
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<CampaignForm> }) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as EmailCampaign
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['campaign', id] })
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_campaigns').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  })
}

export function useSendCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('resend-send', {
        body: { campaign_id: campaignId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { total: number; sent: number; failed: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
