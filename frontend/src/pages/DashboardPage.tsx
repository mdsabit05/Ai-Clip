import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PlusCircle, Video, CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { projectsApi } from '@/services/api'
import { useProjectStore } from '@/store/projectStore'
import ProjectCard from '@/components/dashboard/ProjectCard'
import EmptyState from '@/components/ui/EmptyState'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { projects, setProjects } = useProjectStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
    refetchInterval: 5000,
  })

  useEffect(() => {
    if (data) setProjects(data)
  }, [data, setProjects])

  const stats = {
    total: projects.length,
    completed: projects.filter((p) => p.status === 'completed').length,
    processing: projects.filter((p) =>
      ['downloading', 'analyzing', 'scoring', 'selecting', 'rendering'].includes(p.status)
    ).length,
    totalClips: projects.reduce((s, p) => s + p.clip_count, 0),
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-forge-text">Dashboard</h1>
          <p className="text-forge-muted text-sm mt-1">Your AI-powered video clipping projects</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="forge-btn-primary flex items-center gap-2"
        >
          <PlusCircle size={16} />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Projects', value: stats.total, icon: Video, color: 'text-forge-accent-light' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-forge-green' },
          { label: 'Processing', value: stats.processing, icon: Loader2, color: 'text-forge-cyan', spin: true },
          { label: 'Total Clips', value: stats.totalClips, icon: Clock, color: 'text-forge-amber' },
        ].map(({ label, value, icon: Icon, color, spin }) => (
          <div key={label} className="forge-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-forge-muted font-medium uppercase tracking-widest">{label}</span>
              <Icon size={16} className={`${color} ${spin && value > 0 ? 'animate-spin-slow' : ''}`} />
            </div>
            <span className="text-3xl font-black text-forge-text">{value}</span>
          </div>
        ))}
      </div>

      {/* Projects grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="forge-card p-6 text-center">
          <p className="text-forge-red text-sm">Failed to load projects. Is the backend running?</p>
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No projects yet"
          description="Create your first project to start generating AI-powered vertical clips."
          action={{ label: 'Create Project', onClick: () => navigate('/projects/new') }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
