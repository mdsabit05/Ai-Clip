import { useNavigate } from 'react-router-dom'
import { Film, Trash2, ExternalLink, Clock } from 'lucide-react'
import { formatDistanceToNow } from '../utils/time'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import type { Project } from '@/types'

interface Props {
  project: Project
  onDelete?: (id: string) => void
}

export default function ProjectCard({ project, onDelete }: Props) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (project.status === 'completed') {
      navigate(`/projects/${project.id}/clips`)
    } else if (project.status !== 'failed') {
      navigate(`/projects/${project.id}/processing`)
    }
  }

  return (
    <div className="forge-card overflow-hidden hover:border-forge-accent/40 transition-all duration-200 group cursor-pointer"
      onClick={handleClick}
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-forge-elevated overflow-hidden">
        {project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film size={40} className="text-forge-muted opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-forge-bg/80 to-transparent" />
        <div className="absolute top-3 right-3">
          <StatusBadge status={project.status} size="sm" />
        </div>
        {project.clip_count > 0 && (
          <div className="absolute bottom-3 left-3 bg-black/70 px-2 py-1 rounded text-xs text-forge-text font-medium">
            {project.clip_count} clips
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-forge-text truncate mb-1 group-hover:text-forge-accent-light transition-colors">
          {project.title || 'Untitled Project'}
        </h3>
        <p className="text-forge-muted text-xs truncate mb-3">{project.instruction}</p>

        {/* Progress */}
        {!['completed', 'failed', 'created'].includes(project.status) && (
          <div className="mb-3">
            <ProgressBar value={project.progress} size="sm" animated />
            <p className="text-xs text-forge-muted mt-1 truncate">{project.progress_message}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-forge-border/50">
          <div className="flex items-center gap-1 text-xs text-forge-muted">
            <Clock size={12} />
            {formatDistanceToNow(project.created_at)}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <a
              href={project.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-forge-muted hover:text-forge-cyan transition-colors"
            >
              <ExternalLink size={14} />
            </a>
            {onDelete && (
              <button
                onClick={() => onDelete(project.id)}
                className="p-1.5 text-forge-muted hover:text-forge-red transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
