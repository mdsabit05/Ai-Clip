import clsx from 'clsx'
import type { ProjectStatus, ClipStatus } from '@/types'

type Status = ProjectStatus | ClipStatus

const config: Record<
  Status,
  { label: string; dot: string; badge: string }
> = {
  created: {
    label: 'Created',
    dot: 'bg-forge-muted',
    badge: 'bg-forge-elevated text-forge-muted',
  },
  downloading: {
    label: 'Downloading',
    dot: 'bg-forge-cyan animate-pulse',
    badge: 'bg-forge-cyan-dim text-forge-cyan',
  },
  analyzing: {
    label: 'Analyzing',
    dot: 'bg-forge-accent animate-pulse',
    badge: 'bg-forge-accent-dim text-forge-accent-light',
  },
  scoring: {
    label: 'Scoring',
    dot: 'bg-forge-accent animate-pulse',
    badge: 'bg-forge-accent-dim text-forge-accent-light',
  },
  selecting: {
    label: 'Selecting',
    dot: 'bg-forge-amber animate-pulse',
    badge: 'bg-amber-950/50 text-forge-amber',
  },
  rendering: {
    label: 'Rendering',
    dot: 'bg-forge-cyan animate-pulse',
    badge: 'bg-forge-cyan-dim text-forge-cyan',
  },
  quality_check: {
    label: 'QC Check',
    dot: 'bg-forge-amber animate-pulse',
    badge: 'bg-amber-950/50 text-forge-amber',
  },
  completed: {
    label: 'Completed',
    dot: 'bg-forge-green',
    badge: 'bg-forge-green-dim text-forge-green',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-forge-red',
    badge: 'bg-forge-red-dim text-forge-red',
  },
  pending: {
    label: 'Pending',
    dot: 'bg-forge-muted',
    badge: 'bg-forge-elevated text-forge-muted',
  },
}

interface Props {
  status: Status
  size?: 'sm' | 'md'
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const c = config[status] ?? config.created

  return (
    <span
      className={clsx(
        'status-badge',
        c.badge,
        size === 'sm' && 'text-xs px-2 py-0.5'
      )}
    >
      <span className={clsx('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.label}
    </span>
  )
}
