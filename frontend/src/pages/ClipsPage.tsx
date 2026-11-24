import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Film, RefreshCw } from 'lucide-react'
import { clipsApi, projectsApi } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import ClipCard from '@/components/clips/ClipCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ClipsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject, clips, setClips } = useProjectStore()

  useEffect(() => {
    if (!id) return
    projectsApi.get(id).then(setCurrentProject).catch(() => {})
  }, [id, setCurrentProject])

  const { data: clipsData, isLoading, refetch } = useQuery({
    queryKey: ['clips', id],
    queryFn: () => clipsApi.listByProject(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (clipsData) setClips(clipsData)
  }, [clipsData, setClips])

  const sortedClips = [...clips].sort((a, b) => b.viral_score - a.viral_score)
  const avgScore =
    clips.length > 0
      ? Math.round(clips.reduce((s, c) => s + c.viral_score, 0) / clips.length)
      : 0

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-forge-muted hover:text-forge-text text-sm mb-3 transition-colors"
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>
          <h1 className="text-2xl font-bold text-forge-text mb-1">
            {currentProject?.title || 'Generated Clips'}
          </h1>
          <div className="flex items-center gap-3">
            {currentProject && <StatusBadge status={currentProject.status} />}
            {clips.length > 0 && (
              <span className="text-forge-muted text-sm">
                {clips.length} clips · avg score {avgScore}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="forge-btn-secondary flex items-center gap-1.5 text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {clips.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Clips', value: clips.length },
            { label: 'Avg Viral Score', value: avgScore },
            { label: 'Ready', value: clips.filter((c) => c.status === 'completed').length },
          ].map(({ label, value }) => (
            <div key={label} className="forge-card px-4 py-3 text-center">
              <p className="text-2xl font-black text-forge-text">{value}</p>
              <p className="text-xs text-forge-muted mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Clips grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : sortedClips.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No clips yet"
          description="Clips will appear here once processing is complete."
          action={{ label: 'Go to Dashboard', onClick: () => navigate('/dashboard') }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sortedClips.map((clip, i) => (
            <ClipCard key={clip.id} clip={clip} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
