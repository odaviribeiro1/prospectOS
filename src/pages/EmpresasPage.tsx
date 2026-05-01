import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Search, Sparkles, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { Header } from '../components/layout/Header'
import { EnrichmentProgress } from '../components/enrichment/EnrichmentProgress'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { Skeleton } from '../components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useCompanies } from '../hooks/useCompanies'
import { useEnrichment } from '../hooks/useEnrichment'
import { useBatches } from '../hooks/useBatch'
import { formatCnpj, REGIME_LABELS, PORTE_LABELS } from '../lib/utils'
import type { Company } from '../types'

function RegimeBadge({ regime }: { regime: string }) {
  const map: Record<string, 'success' | 'info' | 'warning' | 'secondary'> = {
    simples: 'success', lucro_presumido: 'info', lucro_real: 'warning', outros: 'secondary',
  }
  return <Badge variant={map[regime] ?? 'secondary'}>{REGIME_LABELS[regime] ?? regime}</Badge>
}

function PorteBadge({ porte }: { porte: string }) {
  return <Badge variant="secondary">{PORTE_LABELS[porte] ?? porte}</Badge>
}

export function EmpresasPage() {
  const [search, setSearch] = useState('')
  const [qualified, setQualified] = useState<'all' | 'yes' | 'no'>('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [enrichOpen, setEnrichOpen] = useState(false)

  const { data: companies = [], isLoading } = useCompanies({ search, qualified, batch_id: batchFilter })
  const { data: batches = [] } = useBatches()
  const { enrichCompanies, isPending: isEnriching } = useEnrichment()

  const selectedIds = Object.entries(rowSelection).filter(([, v]) => v).map(([k]) => k)
  const selectedQualified = companies.filter(c => selectedIds.includes(c.id) && c.qualified)

  const columns = useMemo<ColumnDef<Company>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} />
      ),
      enableSorting: false,
    },
    {
      id: 'expand',
      cell: ({ row }) => (
        <button
          onClick={() => setExpandedRows(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
          className="text-muted-foreground hover:text-foreground"
        >
          {expandedRows[row.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'cnpj',
      header: 'CNPJ',
      cell: ({ getValue }) => <span className="font-mono text-xs">{formatCnpj(getValue() as string)}</span>,
    },
    { accessorKey: 'razao_social', header: 'Razão Social', cell: ({ getValue }) => <span className="max-w-[200px] truncate block">{getValue() as string || '-'}</span> },
    { accessorKey: 'nome_fantasia', header: 'Nome Fantasia', cell: ({ getValue }) => <span className="text-muted-foreground text-xs">{getValue() as string || '-'}</span> },
    {
      accessorKey: 'regime_tributario',
      header: 'Regime',
      cell: ({ getValue }) => <RegimeBadge regime={getValue() as string} />,
    },
    {
      accessorKey: 'porte',
      header: 'Porte',
      cell: ({ getValue }) => <PorteBadge porte={getValue() as string} />,
    },
    {
      accessorKey: 'situacao_cadastral',
      header: 'Situação',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string || '-'}</span>,
    },
    {
      id: 'socios',
      header: 'Sócios',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original.partners ?? []).length}</span>
      ),
    },
    {
      accessorKey: 'qualified',
      header: 'Qualificada',
      cell: ({ getValue }) => getValue()
        ? <Badge variant="success">Qualificada</Badge>
        : <Badge variant="error">Descartada</Badge>,
    },
    {
      id: 'batch',
      header: 'Lote',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.batch?.name ?? '-'}</span>,
    },
  ], [expandedRows])

  const table = useReactTable({
    data: companies,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
    getRowId: (row) => row.id,
  })

  const handleEnrich = async () => {
    const ids = selectedQualified.map(c => c.id)
    setEnrichOpen(true)
    try {
      await enrichCompanies(ids)
    } catch (err) {
      toast.error(`Erro ao enriquecer: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  return (
    <div className="space-y-6">
      <Header
        title="Empresas"
        description="Empresas consultadas via CNPJá"
        actions={
          selectedQualified.length > 0 ? (
            <Button onClick={handleEnrich} disabled={isEnriching}>
              <Sparkles className="h-4 w-4" />
              Enriquecer {selectedQualified.length} empresa{selectedQualified.length > 1 ? 's' : ''}
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por razão social ou CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={qualified} onValueChange={(v) => setQualified(v as typeof qualified)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Qualificação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="yes">Qualificadas</SelectItem>
            <SelectItem value="no">Descartadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os lotes</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' && ' ↑'}
                    {header.column.getIsSorted() === 'desc' && ' ↓'}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-12">
                  Nenhuma empresa encontrada. Faça uma consulta de CNPJ para começar.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <>
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows[row.id] && (
                    <TableRow key={`${row.id}-expanded`} className="bg-muted/30">
                      <TableCell colSpan={columns.length} className="py-4 px-6">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-medium mb-2 text-muted-foreground uppercase tracking-wider">Sócios</p>
                            {(row.original.partners ?? []).length === 0 ? (
                              <p className="text-muted-foreground">Nenhum sócio registrado</p>
                            ) : (
                              <ul className="space-y-1">
                                {(row.original.partners ?? []).map((p) => (
                                  <li key={p.id}>{p.nome} — {p.qualificacao ?? 'Sócio'}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="font-medium mb-2 text-muted-foreground uppercase tracking-wider">Endereço</p>
                            {row.original.endereco ? (
                              <p>{[
                                row.original.endereco.logradouro,
                                row.original.endereco.numero,
                                row.original.endereco.bairro,
                                row.original.endereco.municipio,
                                row.original.endereco.uf,
                              ].filter(Boolean).join(', ')}</p>
                            ) : <p className="text-muted-foreground">Não disponível</p>}
                          </div>
                          <div>
                            <p className="font-medium mb-2 text-muted-foreground uppercase tracking-wider">CNAE</p>
                            <p>{row.original.cnae_principal && `${row.original.cnae_principal} — `}{row.original.cnae_descricao ?? '-'}</p>
                          </div>
                          <div>
                            <p className="font-medium mb-2 text-muted-foreground uppercase tracking-wider">Contato</p>
                            <p>{row.original.email ?? ''} {row.original.telefone ?? ''} {row.original.website ?? ''}</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>{companies.length} empresas no total</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <span className="px-2 py-1">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Próxima
          </Button>
        </div>
      </div>

      <EnrichmentProgress open={enrichOpen} onClose={() => setEnrichOpen(false)} />
    </div>
  )
}
