import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface OnboardingStatus {
  hasFirstBatch: boolean
  hasFirstList: boolean
  hasFirstCampaign: boolean
  isComplete: boolean
}

export function useOnboarding() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: async (): Promise<OnboardingStatus> => {
      const { count: batchCount } = await supabase
        .from('batches')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')

      const { count: listCount } = await supabase
        .from('lead_lists')
        .select('id', { count: 'exact', head: true })

      const { count: campaignCount } = await supabase
        .from('email_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')

      const hasFirstBatch = (batchCount ?? 0) > 0
      const hasFirstList = (listCount ?? 0) > 0
      const hasFirstCampaign = (campaignCount ?? 0) > 0

      const isComplete = hasFirstBatch && hasFirstList && hasFirstCampaign

      return {
        hasFirstBatch,
        hasFirstList,
        hasFirstCampaign,
        isComplete,
      }
    },
    staleTime: 60_000,
  })
}
