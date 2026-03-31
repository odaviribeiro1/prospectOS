import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface OnboardingStatus {
  hasApiKeys: boolean
  hasResend: boolean
  hasChatwoot: boolean
  hasFirstBatch: boolean
  hasFirstList: boolean
  hasFirstCampaign: boolean
  isComplete: boolean
}

export function useOnboarding() {
  return useQuery({
    queryKey: ['onboarding'],
    queryFn: async (): Promise<OnboardingStatus> => {
      const { data: settings } = await supabase
        .from('settings')
        .select('cnpja_api_key, apollo_api_key, resend_api_key, chatwoot_url, chatwoot_api_token')
        .single()

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

      const hasApiKeys = !!(settings?.cnpja_api_key && settings?.apollo_api_key)
      const hasResend = !!settings?.resend_api_key
      const hasChatwoot = !!(settings?.chatwoot_url && settings?.chatwoot_api_token)
      const hasFirstBatch = (batchCount ?? 0) > 0
      const hasFirstList = (listCount ?? 0) > 0
      const hasFirstCampaign = (campaignCount ?? 0) > 0

      // Chatwoot is optional — complete without it
      const isComplete = hasApiKeys && hasResend && hasFirstBatch && hasFirstList && hasFirstCampaign

      return {
        hasApiKeys,
        hasResend,
        hasChatwoot,
        hasFirstBatch,
        hasFirstList,
        hasFirstCampaign,
        isComplete,
      }
    },
    staleTime: 60_000,
  })
}
