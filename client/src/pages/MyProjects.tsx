import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Project } from '@/types'
import { PlusIcon, TrashIcon, FolderIcon, CopyPlusIcon, Loader2Icon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Footer from '@/shared/components/Footer'
import Seo from '@/shared/components/Seo'
import api from '@/shared/api/axios'
import { toast } from 'sonner'
import { authClient } from '@/shared/api/auth-client'
import { useConfirm } from '@/shared/components/ConfirmDialog'

// Lazy thumbnail: only fetches the project's HTML when the card scrolls near the
// viewport, then renders it in a SCRIPTS-ONLY sandbox (no allow-same-origin, even
// for the user's own AI-generated code). Keeps the grid light — the list endpoint
// no longer ships every project's full body, and offscreen cards fetch nothing.
const ProjectThumbnail = ({ projectId, children }: { projectId: string; children?: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect() }
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || code !== null) return
    let cancelled = false
    api.get(`/api/project/thumbnail/${projectId}`)
      .then(({ data }) => { if (!cancelled) setCode(data.code || '') })
      .catch(() => { if (!cancelled) setCode('') })
    return () => { cancelled = true }
  }, [visible, projectId, code])

  return (
    <div ref={ref} className="relative w-full h-40 bg-zinc-900 overflow-hidden border-b border-white/10">
      {code ? (
        <iframe
          srcDoc={code}
          loading="lazy"
          className="absolute top-0 left-0 w-[1200px] h-[800px] origin-top-left pointer-events-none"
          sandbox="allow-scripts"
          style={{ transform: 'scale(0.25)' }}
          title={`preview-${projectId}`}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-600">
          <p>{code === '' ? 'No Preview' : ''}</p>
        </div>
      )}
      {children}
    </div>
  )
}

const MyProjects = () => {
  const { data: session, isPending, error } = authClient.useSession()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const navigate = useNavigate()
  const confirm = useConfirm()

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

  const duplicate = async (projectId: string) => {
    if (duplicatingId) return // in-flight guard — a double-click won't create two copies
    setDuplicatingId(projectId)
    try {
      await api.post(`/api/project/duplicate/${projectId}`)
      toast.success('Project duplicated')
      await fetchProjects()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message)
    } finally {
      setDuplicatingId(null)
    }
  }

  const deleteProject = async (projectId: string) => {
    try {
      const confirmDelete = await confirm({
        title: 'Delete project?',
        message: 'This permanently deletes the project and its version history. This cannot be undone.',
        confirmText: 'Delete',
        tone: 'danger',
      })
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
    if (isPending) return;
    if (session?.user) { fetchProjects(); return; }
    if (error) return;
    navigate('/')
    toast('Please login to view your projects')
    // Depend on the stable user id, not the session object identity, so this
    // doesn't re-run (and refetch) on every render if the ref changes.
  }, [session?.user?.id, isPending, error]);

  return (
    <div className="relative text-white overflow-hidden">
      <Seo title="My Projects" path="/projects" />
      {}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-[40rem] rounded-full bg-indigo-600/15 blur-[130px] animate-aurora" />
      </div>

      <div className="px-4 md:px-16 lg:px-24 xl:px-32 min-h-[80vh]">
        {}
        <div className="flex items-end justify-between gap-4 pt-16 pb-2 animate-fade-in-down">
          <div>
            <p className="text-indigo-400 text-sm font-medium tracking-wide uppercase">Workspace</p>
            <h1 className="text-shimmer text-3xl md:text-4xl font-semibold tracking-tight mt-2">My projects</h1>
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/projects/${project.id}`) }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open project ${project.name}`}
                key={project.id}
                className="group relative glass rounded-2xl overflow-hidden cursor-pointer hover:border-indigo-400/50 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/15 smooth-transition animate-scale-in focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                style={{ animationDelay: `${Math.min(idx * 0.07, 1)}s` }}
                data-testid={`project-card-${project.id}`}
              >
                {}
                <ProjectThumbnail projectId={project.id}>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => duplicate(project.id)}
                      disabled={duplicatingId === project.id}
                      className="absolute top-3 right-12 scale-0 group-hover:scale-100 focus-visible:scale-100 size-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white smooth-transition disabled:opacity-50"
                      title="Duplicate project"
                      aria-label={`Duplicate project ${project.name}`}
                    >
                      {duplicatingId === project.id ? <Loader2Icon className="size-4 animate-spin" /> : <CopyPlusIcon className="size-4" />}
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="absolute top-3 right-3 scale-0 group-hover:scale-100 focus-visible:scale-100 size-8 flex items-center justify-center rounded-lg bg-black/60 backdrop-blur border border-white/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 smooth-transition"
                      title="Delete project"
                      aria-label={`Delete project ${project.name}`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </ProjectThumbnail>

                {}
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
            <h2 className="text-shimmer text-2xl font-semibold">You have no projects yet</h2>
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
