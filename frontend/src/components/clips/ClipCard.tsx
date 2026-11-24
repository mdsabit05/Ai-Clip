import { Download, Play, Edit2, Star } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ScoreRing from '@/components/ui/ScoreRing'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDuration } from '@/components/utils/time'
import { useDownload } from '@/hooks/useDownload'
import type { Clip } from '@/types'
import clsx from 'clsx'

interface Props {
  clip: Clip
  index: number
}

export default function ClipCard({ clip, index }: Props) {
  const navigate = useNavigate()
  const { downloadClip, downloading } = useDownload()
  const isDownloading = downloading === clip.id

  return (
    <div className="forge-card overflow-hidden group hover:border-forge-accent/40 transition-all duration-200 animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Video preview thumbnail */}
      <div className="relative aspect-[9/16] max-h-64 overflow-hidden bg-forge-elevated">
        {clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play size={36} className="text-forge-muted opacity-30" />
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(`/clips/${clip.id}`)}
            className="w-10 h-10 rounded-full bg-forge-accent/90 hover:bg-forge-accent text-white flex items-center justify-center transition-colors"
          >
            <Play size={18} fill="white" />
          </button>
        </div>

        {/* Score badge */}
        <div className="absolute top-2 left-2">
          <ScoreRing score={clip.viral_score} size={44} />
        </div>

        {/* Duration */}
        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs font-mono text-forge-text">
          {formatDuration(clip.duration)}
        </div>

        {/* Status */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={clip.status} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-forge-text text-sm mb-1 truncate">{clip.title}</h3>
        <p className="text-forge-muted text-xs mb-3 line-clamp-2">{clip.description}</p>

        {/* Tags */}
        {clip.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {clip.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-forge-elevated text-forge-muted text-xs border border-forge-border">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Score bar */}
        <div className="flex items-center gap-2 mb-3">
          <Star size={12} className="text-forge-amber" />
          <div className="flex-1 h-1 bg-forge-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-forge-accent to-forge-cyan rounded-full"
              style={{ width: `${clip.viral_score}%` }}
            />
          </div>
          <span className="text-xs font-mono text-forge-subtle">{clip.viral_score}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-forge-border/50">
          <button
            onClick={() => navigate(`/clips/${clip.id}`)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-forge-muted hover:text-forge-text bg-forge-elevated hover:bg-forge-border rounded-lg transition-colors"
          >
            <Edit2 size={12} />
            Edit
          </button>
          <button
            onClick={() => downloadClip(clip.id, clip.title)}
            disabled={clip.status !== 'completed' || isDownloading}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-colors',
              clip.status === 'completed' && !isDownloading
                ? 'text-forge-accent-light hover:bg-forge-accent/20 bg-forge-accent-dim/50'
                : 'text-forge-muted bg-forge-elevated opacity-50 cursor-not-allowed'
            )}
          >
            <Download size={12} />
            {isDownloading ? 'Saving…' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  )
}
