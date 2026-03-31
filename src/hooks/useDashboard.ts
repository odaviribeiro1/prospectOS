import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type DashboardPeriod = '7d' | '30d' | '90d' | 'all'

function getStartDate(period: DashboardPeriod): string | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export interface DashboardData {
  total_companies: number
  qualified_companies: number
  total_enriched_leads: number
  total_campaigns: number
  total_sent: number
  total_delivered: number
  total_opened: number
  total_replied: number
  total_bounced: number
  pending_follow_ups: number
  active_enrollments: number
}

export interface RecentActivityEntry {
  id: string
  type: string
  description: string
  created_at: string
  entity_type?: string
}

export interface CampaignPerfRow {
  id: string
  name: string
  sent_count: number
  delivered_count: number
  opened_count: number
  replied_count: number
  sent_at: string | null
}

export function useDashboard(period: DashboardPeriod) {
  const startDate = useMemo(() => getStartDate(period), [period])

  // Try RPC first, fall back to individual queries
  const { data: rpcData, isLoading: rpcLoading } = useQuery({
    queryKey: ['dashboard-rpc', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')

      const params: { p_user_id: string; p_start_date?: string } = { p_user_id: user.id }
      if (startDate) params.p_start_date = startDate

      const { data, error } = await supabase.rpc('get_dashboard_data', params)
      if (error) throw error
      return data as DashboardData
    },
    retry: false,
  })

  // Fallback: individual queries
  const enabled = !rpcData && !rpcLoading
  const { data: companiesData, isLoading: l1 } = useQuery({
    queryKey: ['dashboard-companies', period],
    queryFn: async () => {
      let q = supabase.from('companies').select('id, qualified', { count: 'exact' }).limit(0)
      if (startDate) q = q.gte('created_at', startDate)
      const total = await q
      let q2 = supabase.from('companies').select('id', { count: 'exact' }).eq('qualified', true).limit(0)
      if (startDate) q2 = q2.gte('created_at', startDate)
      const qualified = await q2
      return { total: total.count ?? 0, qualified: qualified.count ?? 0 }
    },
    enabled,
  })

  const { data: leadsData, isLoading: l2 } = useQuery({
    queryKey: ['dashboard-leads', period],
    queryFn: async () => {
      let q = supabase.from('enriched_leads').select('id', { count: 'exact' }).neq('status', 'rejected').limit(0)
      if (startDate) q = q.gte('created_at', startDate)
      const r = await q
      return r.count ?? 0
    },
    enabled,
  })

  const { data: campaignsData, isLoading: l3 } = useQuery({
    queryKey: ['dashboard-campaigns-agg', period],
    queryFn: async () => {
      let q = supabase.from('email_campaigns').select('sent_count, delivered_count, opened_count, replied_count, bounced_count')
      if (startDate) q = q.gte('sent_at', startDate)
      const { data } = await q
      const rows = data ?? []
      return {
        total: rows.length,
        sent: rows.reduce((s, r) => s + (r.sent_count ?? 0), 0),
        delivered: rows.reduce((s, r) => s + (r.delivered_count ?? 0), 0),
        opened: rows.reduce((s, r) => s + (r.opened_count ?? 0), 0),
        replied: rows.reduce((s, r) => s + (r.replied_count ?? 0), 0),
        bounced: rows.reduce((s, r) => s + (r.bounced_count ?? 0), 0),
      }
    },
    enabled,
  })

  const { data: followUpsData, isLoading: l4 } = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const pending = await supabase
        .from('follow_up_enrollments')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .lte('next_step_due_at', now)
        .limit(0)
      const active = await supabase
        .from('follow_up_enrollments')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .limit(0)
      return { pending: pending.count ?? 0, active: active.count ?? 0 }
    },
    enabled,
  })

  const fallbackData: DashboardData | undefined = useMemo(() => {
    if (!enabled) return undefined
    if (l1 || l2 || l3 || l4) return undefined
    return {
      total_companies: companiesData?.total ?? 0,
      qualified_companies: companiesData?.qualified ?? 0,
      total_enriched_leads: leadsData ?? 0,
      total_campaigns: campaignsData?.total ?? 0,
      total_sent: campaignsData?.sent ?? 0,
      total_delivered: campaignsData?.delivered ?? 0,
      total_opened: campaignsData?.opened ?? 0,
      total_replied: campaignsData?.replied ?? 0,
      total_bounced: campaignsData?.bounced ?? 0,
      pending_follow_ups: followUpsData?.pending ?? 0,
      active_enrollments: followUpsData?.active ?? 0,
    }
  }, [enabled, l1, l2, l3, l4, companiesData, leadsData, campaignsData, followUpsData])

  const data = rpcData ?? fallbackData
  const isLoading = rpcLoading || (enabled && (l1 || l2 || l3 || l4))

  return { data, isLoading }
}

export function useRecentDashboardActivity() {
  return useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: async () => {
      // Pull from follow_up_activity_log as primary source
      const { data: followUpActivity } = await supabase
        .from('follow_up_activity_log')
        .select('id, type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      return (followUpActivity ?? []) as RecentActivityEntry[]
    },
  })
}

export function useCampaignPerformance(period: DashboardPeriod) {
  const startDate = useMemo(() => getStartDate(period), [period])
  return useQuery({
    queryKey: ['dashboard-campaign-perf', period],
    queryFn: async () => {
      let q = supabase
        .from('email_campaigns')
        .select('id, name, sent_count, delivered_count, opened_count, replied_count, sent_at')
        .neq('status', 'draft')
        .order('sent_at', { ascending: false })
        .limit(10)
      if (startDate) q = q.gte('sent_at', startDate)
      const { data } = await q
      return (data ?? []) as CampaignPerfRow[]
    },
  })
}
