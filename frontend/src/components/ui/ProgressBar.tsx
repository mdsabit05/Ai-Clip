import clsx from 'clsx'

interface Props {
  value: number // 0-100
  color?: 'accent' | 'cyan' | 'green'
  size?: 'sm' | 'md'
  animated?: boolean
  label?: string
}

export default function ProgressBar({
  value,
  color = 'accent',
  size = 'md',
  animated = true,
  label,
}: Props) {
  const colorMap = {
    accent: 'from-forge-accent to-forge-cyan',
    cyan: 'from-forge-cyan to-forge-accent',
    green: 'from-forge-green to-forge-cyan',
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1.5">
          <span className="text-xs text-forge-muted">{label}</span>
          <span className="text-xs text-forge-subtle font-mono">{Math.round(value)}%</span>
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-forge-elevated rounded-full overflow-hidden',
          size === 'sm' ? 'h-1' : 'h-1.5'
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full bg-gradient-to-r transition-all duration-500',
            colorMap[color],
            animated && value > 0 && value < 100 && 'animate-pulse-slow'
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}
