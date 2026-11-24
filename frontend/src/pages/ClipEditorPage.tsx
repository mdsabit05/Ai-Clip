import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, Play, Sliders } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { clipsApi } from '@/services/api'
import ScoreRing from '@/components/ui/ScoreRing'
import ScoreBreakdownPanel from '@/components/clips/ScoreBreakdownPanel'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatDuration } from '@/components/utils/time'
import { useDownload } from '@/hooks/useDownload'
import type { RenderOptions } from '@/types'

const DEFAULT_OPTIONS: RenderOptions = {
  caption_style: 'minimal',
  caption_position: 'bottom',
  streamer_height: 35,
  add_zoom_effects: false,
  normalize_audio: true,
  transition_style: 'cut',
}

export default function ClipEditorPage() {
  const { clipId } = useParams<{ clipId: string }>()
  const navigate = useNavigate()
  const { downloadClip, downloading } = useDownload()
  const [options, setOptions] = useState<RenderOptions>(DEFAULT_OPTIONS)
  const [isRerendering, setIsRerendering] = useState(false)

  const { data: clip, isLoading, refetch } = useQuery({
    queryKey: ['clip', clipId],
    queryFn: () => clipsApi.get(clipId!),
    enabled: !!clipId,
    refetchInterval: (query) => (query.state.data?.status === 'rendering' ? 2000 : false),
  })

  const handleRerender = async () => {
    if (!clipId) return
    setIsRerendering(true)
    try {
      await clipsApi.render(clipId, options)
      refetch()
    } finally {
      setIsRerendering(false)
    }
  }

  if (isLoading || !clip) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-forge-muted hover:text-forge-text text-sm mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </button>
          <h1 className="text-xl font-bold text-forge-text">{clip.title}</h1>
          <div className="flex items-center gap-3 mt-1">
            <StatusBadge status={clip.status} />
            <span className="text-forge-muted text-sm font-mono">{formatDuration(clip.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRerender}
            disabled={isRerendering || clip.status === 'rendering'}
            className="forge-btn-secondary flex items-center gap-1.5 text-sm"
          >
            {isRerendering ? <LoadingSpinner size="sm" /> : <RefreshCw size={14} />}
            Re-render
          </button>
          <button
            onClick={() => downloadClip(clip.id, clip.title)}
            disabled={clip.status !== 'completed' || downloading === clip.id}
            className="forge-btn-primary flex items-center gap-1.5 text-sm"
          >
            <Download size={14} />
            Download MP4
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Preview panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video preview */}
          <div className="forge-card overflow-hidden">
            <div className="aspect-[9/16] max-h-96 bg-forge-elevated flex items-center justify-center relative">
              {clip.preview_url ? (
                <video
                  src={clip.preview_url}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <Play size={48} className="text-forge-muted opacity-30 mx-auto mb-3" />
                  <p className="text-forge-muted text-sm">
                    {clip.status === 'rendering' ? 'Rendering…' : 'Preview unavailable'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          {clip.transcript_excerpt && (
            <div className="forge-card p-5">
              <h3 className="text-sm font-semibold text-forge-muted mb-3 uppercase tracking-widest">
                Transcript Excerpt
              </h3>
              <p className="text-sm text-forge-subtle leading-relaxed italic">
                "{clip.transcript_excerpt}"
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Score */}
          <div className="forge-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-forge-muted uppercase tracking-widest">
                Viral Score
              </h3>
              <ScoreRing score={clip.viral_score} size={56} />
            </div>
            <ScoreBreakdownPanel breakdown={clip.score_breakdown} />
          </div>

          {/* Render options */}
          <div className="forge-card p-5">
            <h3 className="text-sm font-semibold text-forge-muted mb-4 uppercase tracking-widest flex items-center gap-2">
              <Sliders size={14} />
              Render Options
            </h3>
            <div className="space-y-4">
              {/* Caption style */}
              <div>
                <label className="forge-label">Caption Style</label>
                <select
                  value={options.caption_style}
                  onChange={(e) => setOptions({ ...options, caption_style: e.target.value as RenderOptions['caption_style'] })}
                  className="forge-input w-full text-sm"
                >
                  <option value="minimal">Minimal</option>
                  <option value="bold">Bold</option>
                  <option value="neon">Neon</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* Caption position */}
              <div>
                <label className="forge-label">Caption Position</label>
                <select
                  value={options.caption_position}
                  onChange={(e) => setOptions({ ...options, caption_position: e.target.value as RenderOptions['caption_position'] })}
                  className="forge-input w-full text-sm"
                >
                  <option value="bottom">Bottom</option>
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                </select>
              </div>

              {/* Streamer height */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="forge-label mb-0">Streamer Height</label>
                  <span className="text-xs text-forge-subtle">{options.streamer_height}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={50}
                  value={options.streamer_height}
                  onChange={(e) => setOptions({ ...options, streamer_height: Number(e.target.value) })}
                  className="w-full accent-forge-accent"
                />
              </div>

              {/* Toggles */}
              {[
                { key: 'add_zoom_effects' as const, label: 'Zoom Effects' },
                { key: 'normalize_audio' as const, label: 'Normalize Audio' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-sm text-forge-subtle">{label}</label>
                  <button
                    onClick={() => setOptions({ ...options, [key]: !options[key] })}
                    className={`w-9 h-5 rounded-full transition-colors ${options[key] ? 'bg-forge-accent' : 'bg-forge-border'}`}
                  >
                    <span
                      className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${options[key] ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Clip metadata */}
          <div className="forge-card p-5">
            <h3 className="text-sm font-semibold text-forge-muted mb-3 uppercase tracking-widest">
              Clip Info
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Start', value: formatDuration(clip.start_time) },
                { label: 'End', value: formatDuration(clip.end_time) },
                { label: 'Duration', value: formatDuration(clip.duration) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-forge-muted">{label}</span>
                  <span className="font-mono text-forge-subtle">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
