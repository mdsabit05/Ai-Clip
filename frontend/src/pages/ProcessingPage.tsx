import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, Zap } from 'lucide-react'
import { useProjectStore } from '@/store/projectStore'
import { useProjectPolling } from '@/hooks/useProjectPolling'
import { projectsApi } from '@/services/api'
import ProgressBar from '@/components/ui/ProgressBar'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import type { ProjectStatus } from '@/types'

const STAGE_LABELS: Record<ProjectStatus, string> = {
  created: 'Initializing…',
  downloading: 'Downloading video from YouTube…',
  analyzing: 'AI analyzing video content, extracting transcript…',
  scoring: 'Scoring viral potential of each moment…',
  selecting: 'Selecting the best clips based on your criteria…',
  rendering: 'Rendering vertical video clips with FFmpeg…',
  quality_check: 'Running quality checks…',
  completed: 'All clips ready!',
  failed: 'Processing failed.',
}

const STAGES: ProjectStatus[] = [
  'downloading',
  'analyzing',
  'scoring',
  'selecting',
  'rendering',
  'quality_check',
  'completed',
]

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()

  useProjectPolling(id)

  useEffect(() => {
    if (!id) return
    projectsApi.get(id).then(setCurrentProject).catch(() => {})
  }, [id, setCurrentProject])

  useEffect(() => {
    if (currentProject?.status === 'completed') {
      const t = setTimeout(() => navigate(`/projects/${id}/clips`), 1500)
      return () => clearTimeout(t)
    }
  }, [currentProject?.status, id, navigate])

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const stageIndex = STAGES.indexOf(currentProject.status as ProjectStatus)
  const isFailed = currentProject.status === 'failed'
  const isCompleted = currentProject.status === 'completed'

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <StatusBadge status={currentProject.status} />
          <h1 className="text-xl font-bold text-forge-text">
            {currentProject.title || 'Processing Project'}
          </h1>
        </div>
        <p className="text-forge-muted text-sm truncate">{currentProject.instruction}</p>
      </div>

      {/* Main progress card */}
      <div className="forge-card p-6 mb-6">
        {isFailed ? (
          <div className="text-center py-6">
            <XCircle size={48} className="text-forge-red mx-auto mb-4" />
            <h2 className="text-lg font-bold text-forge-red mb-2">Processing Failed</h2>
            <p className="text-forge-muted text-sm mb-6">
              {currentProject.error_message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => navigate('/projects/new')}
              className="forge-btn-primary"
            >
              Try Again
            </button>
          </div>
        ) : isCompleted ? (
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="text-forge-green mx-auto mb-4" />
            <h2 className="text-lg font-bold text-forge-green mb-2">Clips Ready!</h2>
            <p className="text-forge-muted text-sm">Redirecting to your clips…</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-forge-accent-dim flex items-center justify-center">
                <Zap size={18} className="text-forge-accent-light" />
              </div>
              <div>
                <p className="text-sm font-semibold text-forge-text">
                  {STAGE_LABELS[currentProject.status]}
                </p>
                <p className="text-xs text-forge-muted">{currentProject.progress_message}</p>
              </div>
            </div>

            <ProgressBar
              value={currentProject.progress}
              animated
              label={`Overall progress`}
            />
          </>
        )}
      </div>

      {/* Stage tracker */}
      {!isFailed && (
        <div className="forge-card p-6">
          <h3 className="text-sm font-semibold text-forge-muted mb-4 uppercase tracking-widest">
            Pipeline Stages
          </h3>
          <div className="space-y-3">
            {STAGES.map((stage, i) => {
              const done = isCompleted || i < stageIndex
              const active = !isCompleted && i === stageIndex
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {done ? (
                      <CheckCircle2 size={18} className="text-forge-green" />
                    ) : active ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-forge-border" />
                    )}
                  </div>
                  <span
                    className={
                      done
                        ? 'text-sm text-forge-green'
                        : active
                        ? 'text-sm text-forge-text font-medium'
                        : 'text-sm text-forge-muted'
                    }
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
