import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Invite, Profile } from '../types'

export function useTeam() {
  return useQuery({
    queryKey: ['team', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as Profile[]
    },
  })
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['team', 'invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .is('used_at', null)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Invite[]
    },
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke('create-invite', {
        body: { email, role: 'member' },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as { ok: true; invite_id: string; invite_url: string; expires_at: string; email_sent: boolean }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'invites'] })
    },
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invite_id: string) => {
      const { data, error } = await supabase.functions.invoke('revoke-invite', {
        body: { invite_id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', 'invites'] })
    },
  })
}
