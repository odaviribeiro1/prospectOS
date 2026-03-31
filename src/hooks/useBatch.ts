import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'
import { delay } from '../lib/utils'
import type { Batch, Company, Partner, QualificationFilters } from '../types'

export function useBatches() {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Batch[]
    },
  })
}

export function useBatch(batchId: string | null) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      if (!batchId) return null
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (error) throw error
      return data as Batch
    },
    enabled: !!batchId,
    refetchInterval: (query) => {
      const batch = query.state.data
      if (!batch) return false
      return batch.status === 'processing' ? 1500 : false
    },
  })
}

export function useProcessBatch() {
  const queryClient = useQueryClient()
  const { setActiveBatchId } = useAppStore()

  return useMutation({
    mutationFn: async ({
      name,
      cnpjs,
      filters,
    }: {
      name: string
      cnpjs: string[]
      filters: QualificationFilters
    }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      // Criar o batch
      const { data: batch, error: batchErr } = await supabase
        .from('batches')
        .insert({
          user_id: user.id,
          name,
          cnpjs,
          total: cnpjs.length,
          filter_regime: filters.regime,
          filter_porte: filters.porte,
          status: 'processing',
        })
        .select()
        .single()

      if (batchErr) throw batchErr
      setActiveBatchId(batch.id)

      let processed = 0
      let qualified = 0
      let disqualified = 0
      let errors = 0
      const errorLog: { cnpj: string; error: string; timestamp: string }[] = []

      // Processar CNPJs sequencialmente
      for (const cnpj of cnpjs) {
        try {
          const { data: lookupData, error: fnErr } = await supabase.functions.invoke('cnpja-lookup', {
            body: { cnpj },
          })

          if (fnErr) throw fnErr

          if (lookupData.error) {
            errors++
            errorLog.push({ cnpj, error: lookupData.error, timestamp: new Date().toISOString() })
          } else {
            const company = lookupData.company as Partial<Company>
            const partners = lookupData.partners as Partial<Partner>[]

            // Verificar qualificação
            const isQualified =
              filters.regime.includes(company.regime_tributario as never) &&
              filters.porte.includes(company.porte as never)

            // Salvar empresa
            const { data: savedCompany, error: companyErr } = await supabase
              .from('companies')
              .insert({
                user_id: user.id,
                batch_id: batch.id,
                cnpj,
                razao_social: company.razao_social,
                nome_fantasia: company.nome_fantasia,
                regime_tributario: company.regime_tributario ?? 'outros',
                porte: company.porte ?? 'outros',
                situacao_cadastral: company.situacao_cadastral,
                cnae_principal: company.cnae_principal,
                cnae_descricao: company.cnae_descricao,
                endereco: company.endereco,
                website: company.website,
                telefone: company.telefone,
                email: company.email,
                raw_data: company.raw_data,
                qualified: isQualified,
              })
              .select()
              .single()

            if (companyErr) throw companyErr

            // Salvar sócios
            if (partners.length > 0) {
              await supabase.from('partners').insert(
                partners.map((p) => ({
                  user_id: user.id,
                  company_id: savedCompany.id,
                  nome: p.nome ?? '',
                  qualificacao: p.qualificacao,
                  cpf_masked: p.cpf_masked,
                  data_entrada: p.data_entrada,
                }))
              )
            }

            if (isQualified) qualified++
            else disqualified++
          }
        } catch (err) {
          errors++
          errorLog.push({
            cnpj,
            error: err instanceof Error ? err.message : 'Erro desconhecido',
            timestamp: new Date().toISOString(),
          })
        }

        processed++

        // Atualizar progresso a cada CNPJ
        await supabase
          .from('batches')
          .update({ processed, qualified, disqualified, errors, error_log: errorLog })
          .eq('id', batch.id)

        queryClient.invalidateQueries({ queryKey: ['batch', batch.id] })

        // Rate limit delay
        await delay(400)
      }

      // Marcar como completo
      const { error: completeErr } = await supabase
        .from('batches')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processed,
          qualified,
          disqualified,
          errors,
          error_log: errorLog,
        })
        .eq('id', batch.id)

      if (completeErr) throw completeErr

      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['batch', batch.id] })
      queryClient.invalidateQueries({ queryKey: ['companies'] })

      return batch
    },
  })
}
