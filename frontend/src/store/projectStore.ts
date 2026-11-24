import { create } from 'zustand'
import type { Project, Clip } from '@/types'

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  clips: Clip[]
  isLoading: boolean
  error: string | null

  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  setClips: (clips: Clip[]) => void
  updateClip: (id: string, updates: Partial<Clip>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  clips: [],
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),

  setCurrentProject: (project) => set({ currentProject: project }),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates }
          : state.currentProject,
    })),

  setClips: (clips) => set({ clips }),

  updateClip: (id, updates) =>
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}))
