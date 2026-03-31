import { useState, useMemo } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  getPaginationRowModel, flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import { formatDateTimeBR } from '../../lib/utils'
import type { EmailSend, EmailSendStatus } from '../../types'

const STATUS_CONFIG: Record<EmailSendStatus, { label: string; variant: 'secondary' | 'info' | 'success' | 'warning' | 'error' }> = {
  queued: { label: '⏳ Na fila', variant: 'secondary' },
  sent: { label: '📤 Enviado', variant: 'info' },
  delivered: { label: '📬 Entregue', variant: 'success' },
  opened: { label: '👁️ Aberto', variant: 'success' },
  clicked: { label: '🔗 Clicado', variant: 'success' },
  bounced: { label: '⚠️ Bounce', variant: 'warning' },
  complained: { label: '🚫 Reclamação', variant: 'error' },
  failed: { label: '❌ Falhou', variant: 'error' },
}

interface SendsTableProps {
  sends: EmailSend[]
  isLoading: boolean
}

export function SendsTable({ sends, isLoading }: SendsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(
    () => statusFilter === 'all' ? sends : sends.filter(s => s.status === statusFilter),
    [sends, statusFilter]
  )

  const columns = useMemo<ColumnDef<EmailSend>[]>(() => [
    {
      id: 'nome',
      header: 'Nome',
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.lead?.nome ?? row.original.to_name}</span>,
    },
    {
      accessorKey: 'to_email',
      header: 'E-mail',
      cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const s = getValue() as EmailSendStatus
        const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.queued
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      accessorKey: 'sent_at',
      header: 'Enviado em',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return <span className="text-xs text-muted-foreground">{v ? formatDateTimeBR(v) : '—'}</span>
      },
    },
    {
      accessorKey: 'delivered_at',
      header: 'Entregue em',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return <span className="text-xs text-muted-foreground">{v ? formatDateTimeBR(v) : '—'}</span>
      },
    },
    {
      accessorKey: 'opened_at',
      header: 'Aberto em',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return <span className="text-xs text-muted-foreground">{v ? formatDateTimeBR(v) : '—'}</span>
      },
    },
    {
      accessorKey: 'replied_at',
      header: 'Respondido em',
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return <span className="text-xs text-muted-foreground">{v ? formatDateTimeBR(v) : '—'}</span>
      },
    },
  ], [])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Envios por lead</p>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-8">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="cursor-pointer" onClick={h.column.getToggleSortingHandler()}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === 'asc' && ' ↑'}
                    {h.column.getIsSorted() === 'desc' && ' ↓'}
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
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                  Nenhum envio encontrado.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map(cell => (
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>{filtered.length} envios</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
          <span className="px-2 py-1">{table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Próxima</Button>
        </div>
      </div>
    </div>
  )
}
