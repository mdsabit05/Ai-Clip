import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, MessageSquare, Upload, Zap, AlertCircle, Video, X } from 'lucide-react'
import { projectsApi } from '@/services/api'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const EXAMPLE_INSTRUCTIONS = [
  'Get me 4 funny and unexpected clips between 9:15 and 1:10:15. Each clip 30–60 seconds.',
  'Find the 3 most emotional moments from the whole video. Keep captions minimal.',
  'Extract 5 exciting highlights between 00:00 and 45:00. Make each clip around 45 seconds.',
  'Give me the 2 best punchlines and reactions from the last hour. No captions needed.',
]

export default function NewProjectPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [instruction, setInstruction] = useState('')
  const [streamerFile, setStreamerFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidYouTubeUrl = (url: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/.test(url)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValidYouTubeUrl(youtubeUrl)) {
      setError('Please enter a valid YouTube URL.')
      return
    }

    if (instruction.trim().length < 10) {
      setError('Please provide more detail in your instruction.')
      return
    }

    setIsCreating(true)
    try {
      const project = await projectsApi.create({
        youtube_url: youtubeUrl,
        instruction: instruction.trim(),
        streamer_video: streamerFile ?? undefined,
      })
      await projectsApi.analyze(project.id)
      navigate(`/projects/${project.id}/processing`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.')
      setIsCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-forge-text">New Project</h1>
        <p className="text-forge-muted text-sm mt-1">
          Paste a YouTube URL and describe what clips you want. The AI handles the rest.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* YouTube URL */}
        <div>
          <label className="forge-label">
            <Link2 size={13} className="inline mr-1.5" />
            YouTube URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="forge-input w-full"
            required
          />
          {youtubeUrl && !isValidYouTubeUrl(youtubeUrl) && (
            <p className="text-xs text-forge-red mt-1.5 flex items-center gap-1">
              <AlertCircle size={12} /> Not a valid YouTube URL
            </p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <label className="forge-label">
            <MessageSquare size={13} className="inline mr-1.5" />
            Natural Language Instructions
          </label>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='e.g. "Get me 4 funny clips between 9:15 and 1:10:15, each around 30–60 seconds"'
            rows={4}
            className="forge-input w-full resize-none"
            required
          />
          <p className="text-xs text-forge-muted mt-1.5">
            Mention: how many clips, timestamps, content type, duration, caption style.
          </p>
        </div>

        {/* Example instructions */}
        <div>
          <p className="text-xs text-forge-muted mb-2 font-medium">Quick examples:</p>
          <div className="flex flex-col gap-2">
            {EXAMPLE_INSTRUCTIONS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setInstruction(ex)}
                className="text-left text-xs text-forge-muted hover:text-forge-subtle px-3 py-2 rounded-lg bg-forge-elevated hover:bg-forge-border border border-forge-border transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Streamer video upload */}
        <div>
          <label className="forge-label">
            <Upload size={13} className="inline mr-1.5" />
            Streamer / Reaction Video{' '}
            <span className="text-forge-muted font-normal">(optional)</span>
          </label>

          {streamerFile ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-forge-elevated border border-forge-border">
              <Video size={18} className="text-forge-accent-light flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-forge-text truncate">{streamerFile.name}</p>
                <p className="text-xs text-forge-muted">
                  {(streamerFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStreamerFile(null)}
                className="text-forge-muted hover:text-forge-red transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-forge-border hover:border-forge-accent/50 rounded-lg p-6 text-center cursor-pointer transition-colors"
            >
              <Upload size={24} className="text-forge-muted mx-auto mb-2" />
              <p className="text-sm text-forge-muted">Click to upload streamer footage</p>
              <p className="text-xs text-forge-muted/60 mt-1">MP4, MOV — will occupy top 35%</p>
              <input
                ref={fileRef}
                type="file"
                accept="video/mp4,video/mov,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setStreamerFile(f)
                }}
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-forge-red-dim border border-forge-red/30">
            <AlertCircle size={16} className="text-forge-red flex-shrink-0 mt-0.5" />
            <p className="text-sm text-forge-red">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="forge-btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="forge-btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <>
                <LoadingSpinner size="sm" />
                Creating…
              </>
            ) : (
              <>
                <Zap size={16} />
                Generate Clips
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
