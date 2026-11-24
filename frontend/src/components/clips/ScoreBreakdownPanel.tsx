import type { ScoreBreakdown } from '@/types'

const labels: Record<keyof ScoreBreakdown, string> = {
  hook_strength: 'Hook Strength',
  entertainment: 'Entertainment',
  emotional_reaction: 'Emotional Reaction',
  unexpectedness: 'Unexpectedness',
  context_independence: 'Context Independence',
  retention_potential: 'Retention Potential',
  ending_quality: 'Ending Quality',
}

interface Props {
  breakdown: ScoreBreakdown
}

export default function ScoreBreakdownPanel({ breakdown }: Props) {
  return (
    <div className="space-y-3">
      {(Object.entries(breakdown) as [keyof ScoreBreakdown, number][]).map(([key, value]) => (
        <div key={key}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-forge-muted">{labels[key]}</span>
            <span className="text-xs font-mono text-forge-subtle">{value}</span>
          </div>
          <div className="h-1.5 bg-forge-elevated rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-forge-accent to-forge-cyan transition-all duration-500"
              style={{ width: `${value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
