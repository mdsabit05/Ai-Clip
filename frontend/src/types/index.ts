// ─── Project Types ─────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'created'
  | 'downloading'
  | 'analyzing'
  | 'scoring'
  | 'selecting'
  | 'rendering'
  | 'quality_check'
  | 'completed'
  | 'failed'

export interface Project {
  id: string
  title: string
  youtube_url: string
  instruction: string
  status: ProjectStatus
  progress: number
  progress_message: string
  video_duration: number | null
  thumbnail_url: string | null
  clip_count: number
  created_at: string
  updated_at: string
  error_message?: string
  parsed_instruction?: ParsedInstruction
}

export interface ParsedInstruction {
  clip_count: number
  start_time: number
  end_time: number
  preferred_moments: string[]
  min_duration: number
  max_duration: number
  aspect_ratio: string
  streamer_height: number
  original_video_height: number
  caption_style: 'minimal' | 'bold' | 'neon' | 'none'
  caption_position: 'bottom' | 'center' | 'top'
}

// ─── Clip Types ─────────────────────────────────────────────────────────────────

export type ClipStatus = 'pending' | 'rendering' | 'completed' | 'failed'

export interface Clip {
  id: string
  project_id: string
  title: string
  description: string
  start_time: number
  end_time: number
  duration: number
  viral_score: number
  score_breakdown: ScoreBreakdown
  status: ClipStatus
  thumbnail_url: string | null
  preview_url: string | null
  download_url: string | null
  transcript_excerpt: string
  tags: string[]
  created_at: string
}

export interface ScoreBreakdown {
  hook_strength: number
  entertainment: number
  emotional_reaction: number
  unexpectedness: number
  context_independence: number
  retention_potential: number
  ending_quality: number
}

// ─── Transcript Types ───────────────────────────────────────────────────────────

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  confidence: number
}

// ─── API Response Types ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
}

export interface JobStatus {
  job_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  result?: unknown
  error?: string
}

// ─── Form Types ─────────────────────────────────────────────────────────────────

export interface CreateProjectForm {
  youtube_url: string
  instruction: string
  streamer_video?: File
}

// ─── Render Options ─────────────────────────────────────────────────────────────

export interface RenderOptions {
  caption_style: 'minimal' | 'bold' | 'neon' | 'none'
  caption_position: 'bottom' | 'center' | 'top'
  streamer_height: number
  add_zoom_effects: boolean
  normalize_audio: boolean
  transition_style: 'cut' | 'fade' | 'none'
}
