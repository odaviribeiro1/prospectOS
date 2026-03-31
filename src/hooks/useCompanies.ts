import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Company } from '../types'

export function useCompanies(filters?: {
  search?: string
  qualified?: 'all' | 'yes' | 'no'
  batch_id?: string
}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('*, batch:batches(id, name), partners(*)')
        .order('created_at', { ascending: false })

      if (filters?.search) {
        query = query.or(`razao_social.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`)
      }

      if (filters?.qualified === 'yes') query = query.eq('qualified', true)
      if (filters?.qualified === 'no') query = query.eq('qualified', false)

      if (filters?.batch_id && filters.batch_id !== 'all') {
        query = query.eq('batch_id', filters.batch_id)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Company[]
    },
  })
}
