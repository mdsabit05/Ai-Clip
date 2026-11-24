import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-forge-elevated border border-forge-border flex items-center justify-center mb-4">
        <Icon size={28} className="text-forge-muted" />
      </div>
      <h3 className="text-lg font-semibold text-forge-text mb-2">{title}</h3>
      <p className="text-forge-muted text-sm max-w-sm">{description}</p>
      {action && (
        <button onClick={action.onClick} className="forge-btn-primary mt-6">
          {action.label}
        </button>
      )}
    </div>
  )
}
