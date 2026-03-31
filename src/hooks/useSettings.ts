import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Settings } from '../types'

export function useSettings() {
  const queryClient = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as Settings | null
    },
  })

  const { mutateAsync: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: async (values: Partial<Settings>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase
        .from('settings')
        .upsert({ ...values, user_id: user.id }, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error
      return data as Settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })

  const hasApiKeys = !!(settings?.cnpja_api_key && settings?.apollo_api_key)

  return { settings, isLoading, saveSettings, isSaving, hasApiKeys }
}
