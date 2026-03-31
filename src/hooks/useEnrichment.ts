import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import type { ApolloEnrichResult } from '../types'

export function useEnrichment() {
  const queryClient = useQueryClient()
  const { setEnrichmentProgress, resetEnrichment } = useAppStore()

  const { mutateAsync: enrichCompanies, isPending } = useMutation({
    mutationFn: async (companyIds: string[]) => {
      resetEnrichment()
      setEnrichmentProgress({ status: 'processing', total: companyIds.length, current: 0 })

      const { data, error } = await supabase.functions.invoke('apollo-enrich', {
        body: { company_ids: companyIds },
      })

      if (error) {
        setEnrichmentProgress({ status: 'error' })
        throw error
      }

      if (data.error) {
        setEnrichmentProgress({ status: 'error' })
        throw new Error(data.error)
      }

      const result = data as ApolloEnrichResult
      setEnrichmentProgress({ status: 'done', result, current: result.total })

      queryClient.invalidateQueries({ queryKey: ['lead-lists'] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })

      return result
    },
  })

  return { enrichCompanies, isPending }
}
