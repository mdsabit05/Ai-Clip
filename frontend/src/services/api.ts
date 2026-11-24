import axios from 'axios'
import type {
  Project,
  Clip,
  CreateProjectForm,
  RenderOptions,
  ParsedInstruction,
  JobStatus,
} from '@/types'

const http = axios.create({
  baseURL: '/api',
  timeout: 30_000,
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

// ─── Projects ───────────────────────────────────────────────────────────────────

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const { data } = await http.get('/projects')
    return data
  },

  get: async (id: string): Promise<Project> => {
    const { data } = await http.get(`/projects/${id}`)
    return data
  },

  create: async (form: CreateProjectForm): Promise<Project> => {
    const fd = new FormData()
    fd.append('youtube_url', form.youtube_url)
    fd.append('instruction', form.instruction)
    if (form.streamer_video) fd.append('streamer_video', form.streamer_video)
    const { data } = await http.post('/projects', fd)
    return data
  },

  analyze: async (id: string): Promise<{ job_id: string }> => {
    const { data } = await http.post(`/projects/${id}/analyze`)
    return data
  },

  getStatus: async (id: string): Promise<Project> => {
    const { data } = await http.get(`/projects/${id}/status`)
    return data
  },

  parseInstruction: async (
    instruction: string,
    youtube_url: string
  ): Promise<ParsedInstruction> => {
    const { data } = await http.post('/projects/parse-instruction', {
      instruction,
      youtube_url,
    })
    return data
  },

  delete: async (id: string): Promise<void> => {
    await http.delete(`/projects/${id}`)
  },
}

// ─── Clips ──────────────────────────────────────────────────────────────────────

export const clipsApi = {
  listByProject: async (projectId: string): Promise<Clip[]> => {
    const { data } = await http.get(`/projects/${projectId}/clips`)
    return data
  },

  get: async (clipId: string): Promise<Clip> => {
    const { data } = await http.get(`/clips/${clipId}`)
    return data
  },

  render: async (clipId: string, options?: RenderOptions): Promise<{ job_id: string }> => {
    const { data } = await http.post(`/clips/${clipId}/render`, options ?? {})
    return data
  },

  download: async (clipId: string): Promise<Blob> => {
    const { data } = await http.get(`/clips/${clipId}/download`, {
      responseType: 'blob',
    })
    return data
  },

  updateTitle: async (clipId: string, title: string): Promise<Clip> => {
    const { data } = await http.patch(`/clips/${clipId}`, { title })
    return data
  },
}

// ─── Jobs ────────────────────────────────────────────────────────────────────────

export const jobsApi = {
  getStatus: async (jobId: string): Promise<JobStatus> => {
    const { data } = await http.get(`/jobs/${jobId}`)
    return data
  },
}

export default http
