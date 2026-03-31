import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CheckSquare, XSquare, Loader2, Mail, Link, Phone } from 'lucide-react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  flexRender, type ColumnDef,
} from '@tanstack/react-table'
import { Header } from '../components/layout/Header'
import { LeadDetailDrawer } from '../components/leads/LeadDetailDrawer'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Checkbox } from '../components/ui/checkbox'
import { Skeleton } from '../components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { useLeadList, useLeads, useReviewList } from '../hooks/useLeadLists'
import type { EnrichedLead, ListStatus } from '../types'

function StatusBadge({ status }: { status: ListStatus }) {
  const map = { pending_review: 'warning', reviewed: 'success', in_campaign: 'info' } as const
  const label = { pending_review: 'Pendente Revisão', reviewed: 'Revisada', in_campaign: 'Em Campanha' }
  return <Badge variant={map[status]}>{label[status]}</Badge>
}

function IconCheck({ has }: { has: boolean }) {
  return has
    ? <span className="text-emerald-400">✓</span>
    : <span className="text-muted-foreground/40">✗</span>
}

export function LeadReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: list } = useLeadList(id)
  const { data: leads = [], isLoading } = useLeads(id)
  const { mutateAsync: reviewList, isPending: isReviewing } = useReviewList()

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null)

  const withEmail = leads.filter(l => l.email).length
  const withLinkedin = leads.filter(l => l.linkedin_url).length
  const withPhone = leads.filter(l => l.telefone).length

  const columns = useMemo<ColumnDef<EnrichedLead>[]>(() => [
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
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ row }) => (
        <button
          className="text-left hover:text-primary transition-colors font-medium text-sm"
          onClick={() => setSelectedLead(row.original)}
        >
          {row.original.nome}
        </button>
      ),
    },
    {
      id: 'empresa',
      header: 'Empresa',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.empresa_nome ?? row.original.company?.razao_social ?? '-'}
        </span>
      ),
    },
    {
      accessorKey: 'cargo',
      header: 'Cargo',
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground">{getValue() as string || '-'}</span>
      ),
    },
    {
      id: 'email',
      header: 'E-mail',
      cell: ({ row }) => <IconCheck has={!!row.original.email} />,
    },
    {
      id: 'linkedin',
      header: 'LinkedIn',
      cell: ({ row }) => <IconCheck has={!!row.original.linkedin_url} />,
    },
    {
      id: 'phone',
      header: 'Telefone',
      cell: ({ row }) => <IconCheck has={!!row.original.telefone} />,
    },
  ], [])

  const table = useReactTable({
    data: leads,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    getRowId: (row) => row.id,
  })

  const handleApproveAll = () => {
    const selection: Record<string, boolean> = {}
    leads.forEach(l => { selection[l.id] = true })
    setRowSelection(selection)
  }

  const handleFinishReview = async () => {
    if (!id) return
    const approvedIds = Object.entries(rowSelection).filter(([, v]) => v).map(([k]) => k)
    const rejectedIds = leads.filter(l => !approvedIds.includes(l.id)).map(l => l.id)

    try {
      await reviewList({ listId: id, approvedIds, rejectedIds })
      toast.success(`Revisão concluída: ${approvedIds.length} aprovados, ${rejectedIds.length} rejeitados`)
      navigate('/listas')
    } catch {
      toast.error('Erro ao concluir revisão. Tente novamente.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/listas')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Header
          title={list?.title ?? 'Carregando...'}
          actions={list && <StatusBadge status={list.status} />}
        />
      </div>

      {/* Indicadores de qualidade */}
      {leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Mail, label: 'Com e-mail', count: withEmail, total: leads.length, color: 'text-blue-400' },
            { icon: Link, label: 'Com LinkedIn', count: withLinkedin, total: leads.length, color: 'text-blue-400' },
            { icon: Phone, label: 'Com telefone', count: withPhone, total: leads.length, color: 'text-blue-400' },
            { icon: CheckSquare, label: 'Total de leads', count: leads.length, total: leads.length, color: 'text-primary' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border bg-card p-3 flex items-center gap-3">
              <stat.icon className={`h-4 w-4 ${stat.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold text-sm">
                  {stat.count === stat.total ? stat.count : `${Math.round((stat.count / stat.total) * 100)}%`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleApproveAll}>
          <CheckSquare className="h-4 w-4" />
          Aprovar todos
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRowSelection({})}
        >
          <XSquare className="h-4 w-4" />
          Desmarcar todos
        </Button>
        <div className="flex-1" />
        {list?.status === 'pending_review' && (
          <Button onClick={handleFinishReview} disabled={isReviewing}>
            {isReviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Concluir Revisão
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-12">
                  Nenhum lead nesta lista.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          {Object.values(rowSelection).filter(Boolean).length} selecionados de {leads.length} leads
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="px-2 py-1">{table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próxima</Button>
        </div>
      </div>

      <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onClose={() => setSelectedLead(null)} />
    </div>
  )
}
