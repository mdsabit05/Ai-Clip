import { useEffect, useRef } from 'react'
import { useProjectStore } from '@/store/projectStore'
import { projectsApi } from '@/services/api'
import type { ProjectStatus } from '@/types'

const TERMINAL_STATUSES: ProjectStatus[] = ['completed', 'failed']
const POLL_INTERVAL = 2000

export function useProjectPolling(projectId: string | undefined) {
  const { updateProject } = useProjectStore()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!projectId) return

    const poll = async () => {
      try {
        const project = await projectsApi.getStatus(projectId)
        updateProject(projectId, project)

        if (TERMINAL_STATUSES.includes(project.status)) {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch {
        // silent — polling will retry
      }
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [projectId, updateProject])
}
