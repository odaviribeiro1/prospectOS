import { Skeleton } from './skeleton'

interface TableSkeletonProps {
  rows?: number
  columns?: number
}

const COL_WIDTHS = ['w-1/4', 'w-1/3', 'w-1/5', 'w-1/4', 'w-1/6']

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-md border border-border overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 bg-muted/50 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${COL_WIDTHS[i % COL_WIDTHS.length]}`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="flex gap-4 px-4 py-3.5 border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, ci) => (
            <Skeleton
              key={ci}
              className={`h-4 ${COL_WIDTHS[(ci + ri) % COL_WIDTHS.length]}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
