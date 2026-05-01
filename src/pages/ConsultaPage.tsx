import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { CnpjInput } from '../components/cnpj/CnpjInput'
import { QualificationFilters } from '../components/cnpj/QualificationFilters'
import { BatchProgress } from '../components/cnpj/BatchProgress'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { batchSchema, type BatchForm } from '../lib/validators'
import { useProcessBatch, useBatch } from '../hooks/useBatch'
import { useAppStore } from '../stores/appStore'
import type { QualificationFilters as Filters } from '../types'

export function ConsultaPage() {
  const { activeBatchId } = useAppStore()
  const { data: activeBatch } = useBatch(activeBatchId)
  const { mutateAsync: processBatch, isPending } = useProcessBatch()

  const [cnpjs, setCnpjs] = useState<string[]>([])
  const [filters, setFilters] = useState<Filters>({
    regime: ['simples', 'lucro_presumido'],
    porte: ['me', 'epp'],
  })

  const { register, handleSubmit, control, formState: { errors } } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      name: `Lote ${new Date().toLocaleDateString('pt-BR')}`,
      cnpjs: [],
      filter_regime: ['simples', 'lucro_presumido'],
      filter_porte: ['me', 'epp'],
    },
  })

  const onSubmit = async (data: BatchForm) => {
    if (cnpjs.length === 0) {
      toast.error('Adicione pelo menos 1 CNPJ válido.')
      return
    }

    if (filters.regime.length === 0 || filters.porte.length === 0) {
      toast.error('Selecione pelo menos 1 regime e 1 porte nos filtros.')
      return
    }

    try {
      await processBatch({ name: data.name, cnpjs, filters })
      toast.success(`Lote "${data.name}" processado com sucesso!`)
    } catch (err) {
      toast.error(`Erro ao processar lote: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  const isProcessing = activeBatch?.status === 'processing'

  return (
    <div className="space-y-6">
      <Header
        title="Consulta de CNPJ em Lote"
        description="Consulte múltiplos CNPJs de uma vez e qualifique automaticamente"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome do lote */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Identificação do Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome do lote</Label>
              <Input
                id="name"
                placeholder="Ex: Contadores SP - Março 2026"
                {...register('name')}
                disabled={isPending}
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* CNPJs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">CNPJs para consulta</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              name="cnpjs"
              control={control}
              render={() => (
                <CnpjInput
                  value={cnpjs}
                  onChange={(list) => setCnpjs(list)}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filtros de Qualificação</CardTitle>
          </CardHeader>
          <CardContent>
            <QualificationFilters value={filters} onChange={setFilters} />
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isPending || isProcessing || cnpjs.length === 0}
          className="w-full sm:w-auto"
        >
          {isPending || isProcessing ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Processando...</>
          ) : (
            <><Search className="h-4 w-4" />Iniciar Consulta ({cnpjs.length} CNPJs)</>
          )}
        </Button>
      </form>

      {/* Progresso */}
      {activeBatch && (activeBatch.status === 'processing' || activeBatch.status === 'completed') && (
        <BatchProgress batch={activeBatch} />
      )}
    </div>
  )
}
