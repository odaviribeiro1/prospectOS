import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useProfile() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as Profile | null
    },
  })

  const isGestor = profile?.role === 'gestor'

  return { profile, isLoading, isGestor }
}
