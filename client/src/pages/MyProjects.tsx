import { useEffect, useState } from 'react'
import type { Project } from '../types'
import { Loader2Icon, PlusIcon, TrashIcon, FolderIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import api from '@/configs/axios'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'

const MyProjects = () => {
  const { data: session, isPending } = authClient.useSession()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const navigate = useNavigate()

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/api/user/projects')
      setProjects(data.projects)
      setLoading(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
      console.error('Error fetching projects', error)
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const confirmDelete = window.confirm('Are you sure you want to delete this project? ')
      if (!confirmDelete) return
      const { data } = await api.delete(`/api/project/${projectId}`)
      toast.success(data.message)
      fetchProjects()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
      console.error('Error deleting project', error)
    }
  }

  useEffect(() => {
    if (session?.user && !isPending) {
      fetchProjects()
    } else if (!isPending && !session?.user) {
      navigate('/')
      toast('Please login to view your projects')
    }
  }, [session?.user]);

  return (
    <div className="relative text-white overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/15 blur-[130px] animate-aurora" />
      </div>

      <div className="px-4 md:px-16 lg:px-24 xl:px-32 min-h-[80vh]">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 pt-16 pb-2 animate-fade-in-down">
          <div>
            <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">Workspace</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mt-2">My projects</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white px-4 sm:px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition animate-gradient"
          >
            <PlusIcon size={18} /> Create new
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-12">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-white/5" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 py-12 animate-fade-in-up">
            {projects.map((project, idx) => (
              <div
                onClick={() => navigate(`/projects/${project.id}`)}
                key={project.id}
                className="group relative glass rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-400/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/15 smooth-transition animate-scale-in"
                style={{ animationDelay: `${Math.min(idx * 0.07, 1)}s` }}
                data-testid={`project-card-${project.id}`}
              >
                {/* Preview */}
                <div className="relative w-full h-40 bg-zinc-900 overflow-hidden border-b border-white/10">
                  {project.current_code ? (
                    <iframe
                      srcDoc={project.current_code}
                      className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
                      sandbox="allow-scripts allow-same-origin"
                      style={{ transform: 'scale(0.25)' }}
                      title={`preview-${project.id}`}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-600">
                      <p>No Preview</p>
                    </div>
                  )}
                  {/* Delete */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="absolute top-3 right-3 scale-0 group-hover:scale-100 size-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur border border-white/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 smooth-transition"
                      title="Delete project"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold line-clamp-1">{project.name}</h2>
                    <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                      Website
                    </span>
                  </div>
                  <p className="text-gray-400 mt-1.5 text-sm line-clamp-2 min-h-[2.5rem]">
                    {project.initial_prompt}
                  </p>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex justify-between items-center mt-4 pt-3 border-t border-white/5"
                  >
                    <span className="text-xs text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2 text-white text-sm">
                      <button
                        onClick={() => navigate(`/preview/${project.id}`)}
                        className="px-3 py-1.5 glass hover:bg-white/10 rounded-md smooth-transition"
                        type="button"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="px-3 py-1.5 rounded-md bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/30 smooth-transition"
                        type="button"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-28 animate-fade-in-up">
            <div className="flex items-center justify-center size-16 rounded-2xl glass mb-6">
              <FolderIcon className="size-7 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-200">You have no projects yet</h2>
            <p className="text-gray-500 mt-2 max-w-sm">Describe an idea on the home page and your first website will appear here.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 flex items-center gap-2 text-white px-6 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition animate-gradient"
            >
              <PlusIcon size={18} /> Create new project
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

export default MyProjects
