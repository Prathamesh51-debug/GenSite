import  { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { type Project } from '@/types'
import {
  ArrowBigDownDashIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  FullscreenIcon,
  LaptopIcon,
  Loader2Icon,
  MessageSquareIcon,
  RefreshCwIcon,
  SaveIcon,
  SmartphoneIcon,
  TabletIcon,
} from 'lucide-react'

import Sidebar from '@/features/editor/Sidebar'
import ProjectPreview from '@/features/editor/ProjectPreview'
import type { ProjectPreviewRef } from '@/features/editor/ProjectPreview'
import api from '@/shared/api/axios'
import { toast } from 'sonner'
import { authClient } from '@/shared/api/auth-client'
import { emitCreditsChanged } from '@/features/billing/credits-bus'
import { useConfirm } from '@/shared/components/ConfirmDialog'


const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Set only when navigating here straight from creation — gates whether we
  // auto-generate. Reopening an ungenerated project later shows a Generate button
  // instead, so the user is never silently re-charged on page load.
  const autostart = Boolean((location.state as { autostart?: boolean } | null)?.autostart)
  const {data: session, isPending, error} = authClient.useSession()
  const confirm = useConfirm()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [isGenerating, setIsGenerating] = useState(true)
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop')

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

   const previewRef =useRef<ProjectPreviewRef>(null)

   const [streamHtml, setStreamHtml] = useState('')
   const [genStatus, setGenStatus] = useState('')
   // Active page lives here (not inside ProjectPreview) so a chat revision can target
   // the page the user is viewing, and the view stays on it after the edit applies.
   const [activeFile, setActiveFile] = useState('index.html')
   const streamedRef = useRef<string | null>(null)
   const acRef = useRef<AbortController | null>(null)
   const autoConsumedRef = useRef(false)

   const fetchProject =async () => {
   try {
    const { data } = await api.get(`/api/user/project/${projectId}`);
    setProject(data.project)
    // generating only if it has no code AND we arrived to auto-generate; otherwise
    // show the preview (has code) or the Generate button (no code, manual).
    setIsGenerating(data.project?.current_code ? false : autostart)
   }catch(error: any){
    toast.error(error?.response?.data?.message || error.message);
    console.log(error);
   }finally{
    // Always clear the loading state — otherwise a 404 (project not found) leaves
    // the page stuck on an infinite spinner instead of the "Unable to load" view.
    setLoading(false)
   }
  }

   const saveProject = async () => {
    if(!previewRef.current) return;
    setIsSaving(true);
    try {
      const data = await previewRef.current.save();
      if (data) toast.success(data.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }finally{
      setIsSaving(false);
    }
   };

   const triggerDownload = (blob: Blob, filename: string) => {
    const el = document.createElement('a');
    el.href = URL.createObjectURL(blob);
    el.download = filename;
    document.body.appendChild(el);
    el.click();
    el.remove();
   }

   const downloadCode = async () =>{
    const files = project?.files;
    // Multi-page → download the whole site as a ZIP.
    if (files && Object.keys(files).length > 1) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        const freshIndex = previewRef.current?.getCode(); // latest (possibly unsaved) home page
        Object.entries(files).forEach(([path, html]) => {
          zip.file(path, path === 'index.html' && freshIndex ? freshIndex : (html as string));
        });
        const blob = await zip.generateAsync({ type: 'blob' });
        triggerDownload(blob, 'site.zip');
      } catch {
        toast.error('Could not build the ZIP — try again.');
      }
      return;
    }
    // Single page → one index.html.
    const code = previewRef.current?.getCode() || project?.current_code;
    if(!code) return toast.error('Nothing to download yet');
    triggerDownload(new Blob([code], { type: 'text/html' }), 'index.html');
   }

   const copyCode = async () => {
    const code = previewRef.current?.getCode() || project?.current_code;
    if(!code) return toast.error('Nothing to copy yet');
    try {
      await navigator.clipboard.writeText(code);
      toast.success('HTML copied to clipboard');
    } catch {
      toast.error('Could not copy — try Download instead');
    }
   }

   const togglePublish = async () => {
    try {
      const willPublish = !project?.isPublished;
      const {data} = await api.post(`/api/user/publish-toggle/${projectId}`);
      setProject((prev)=> prev ? ({...prev, isPublished : !prev.isPublished}): null)
      if (willPublish) {
        // Surface the public link the moment it's shareable — copy it for them.
        const link = `${window.location.origin}/view/${projectId}`;
        try {
          await navigator.clipboard.writeText(link);
          toast.success('Published! Share link copied to clipboard.');
        } catch {
          toast.success(`Published! Share: ${link}`);
        }
      } else {
        toast.success(data.message);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }
   };

   useEffect(()=>{
    if(isPending) return;
    if(session?.user){
      fetchProject();
      return;
    }
    if(error) return;
    navigate("/")
    toast("Please login to view your projects")
    // Stable user id, not the session object identity, to avoid re-running on
    // every render if the reference changes.
   },[session?.user?.id, isPending, error])

  // Kicks off generation (fresh build or retry). POST because it mutates state;
  // EventSource is GET-only, so we read the SSE stream off a fetch() body.
  const startGeneration = useCallback((force = false) => {
    if (!project?.id) return;
    if (!force && project.current_code) return;
    if (streamedRef.current === project.id) return; // already running for this project
    streamedRef.current = project.id;
    setIsGenerating(true);

    const base = import.meta.env.VITE_BASEURL || 'http://localhost:3000';
    const ac = new AbortController();
    acRef.current = ac;

    const handleEvent = (d: any) => {
      if (d.type === 'progress') {
        // Real build progress from the server ("Designing your site…",
        // "Building 3 pages…") — surfaced in the loader instead of a generic spinner.
        setGenStatus(d.message || '');
      } else if (d.type === 'chunk') {
        setStreamHtml(d.html);
      } else if (d.type === 'done') {
        ac.abort();
        setStreamHtml('');
        setGenStatus('');
        emitCreditsChanged(); // generation charged 5 credits
        fetchProject();
      } else if (d.type === 'error') {
        ac.abort();
        streamedRef.current = null; // allow a manual retry
        setStreamHtml('');
        setGenStatus('');
        setIsGenerating(false);
        toast.error(d.message || 'Generation failed');
        fetchProject();
      }
    };

    (async () => {
      try {
        const res = await fetch(`${base}/api/project/stream/${project.id}`, {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'text/event-stream' },
          signal: ac.signal,
        });
        if (!res.ok || !res.body) { streamedRef.current = null; setIsGenerating(false); fetchProject(); return; }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // SSE frames are separated by a blank line.
          let sep: number;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!dataLine) continue;
            try { handleEvent(JSON.parse(dataLine.slice(5).trim())); } catch { }
          }
        }
      } catch {
        if (!ac.signal.aborted) { streamedRef.current = null; setIsGenerating(false); fetchProject(); }
      }
    })();
  }, [project?.id, project?.current_code])

  // Auto-generate ONLY for a freshly created project (arrived with autostart).
  // Consume the flag once AND strip it from history.state so a page refresh can't
  // re-trigger generation (and re-charge the user).
  useEffect(() => {
    if (autostart && !autoConsumedRef.current && project?.id && !project.current_code) {
      autoConsumedRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      startGeneration();
    }
  }, [autostart, project?.id, project?.current_code, startGeneration, navigate, location.pathname])

  // Abort any in-flight generation if the user leaves the editor.
  useEffect(() => () => acRef.current?.abort(), [])

  // Switching to a different project resets the active page back to Home.
  useEffect(() => { setActiveFile('index.html') }, [projectId])

  const regenerate = async () => {
    const ok = await confirm({
      title: 'Regenerate from scratch?',
      message: 'This builds a brand-new version from your original prompt (5 credits). Your current version stays in history.',
      confirmText: 'Regenerate',
    });
    if (!ok) return;
    try {
      await api.post(`/api/project/regenerate/${projectId}`);
      setProject((prev) => (prev ? { ...prev, current_code: undefined } : prev));
      setStreamHtml('');
      streamedRef.current = null;
      startGeneration(true);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  }

  const cancelGeneration = async () => {
    acRef.current?.abort();          // stop reading locally
    streamedRef.current = null;
    setStreamHtml('');
    setGenStatus('');
    setIsGenerating(false);
    // Tell the server to abort the run server-side (which triggers the refund),
    // rather than relying only on connection-close.
    try { await api.post(`/api/project/cancel/${projectId}`); } catch { }
    toast('Generation cancelled.');
    // Give the refund a moment to commit, then refresh the balance.
    setTimeout(() => emitCreditsChanged(), 1500);
  }
    


  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-screen">
          <Loader2Icon className="size-7 animate-spin text-indigo-200" />
        </div>
      </>
    )
  }

  return project ? (
    <div className='flex flex-col h-screen w-full bg-gray-900 text-white'>
      {}
        <div className='flex max-sm:flex-col sm:items-center gap-4 px-4 py-2
        no-scrollbar'>
          
          {}
          <div className='flex items-center gap-2 sm:min-w-90 text-nowrap'>
            <img src="/favicon.png" alt='GenSite' className='h-7 cursor-pointer'
            onClick={()=>navigate('/')}/>
            <div className='max-w-64 sm:max-w-xs'>
              <p className='text-sm font-medium capitalize truncate'>{project.name}</p>
              <p className='text-xs text-gray-400 -mt-0.5'>
                {isGenerating ? 'Generating…' : project.current_code ? 'Previewing last saved version' : 'Not generated yet'}
              </p>
            </div>
            <div className='sm:hidden flex-1 flex justify-end'>
              <button
                type='button'
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Show chat' : 'Show preview'}
                className='flex items-center gap-1.5 text-xs font-medium p-1 text-gray-300 hover:text-white transition-colors'
              >
                {isMenuOpen
                  ? <><MessageSquareIcon className='size-5'/> Chat</>
                  : <><EyeIcon className='size-5'/> Preview</>}
              </button>
            </div>
          </div>
          {}
          <div className='hidden sm:flex gap-2 bg-gray-950 p-1.5 rounded-md' role='group' aria-label='Preview device'>
            {([
              { id: 'phone', Icon: SmartphoneIcon, label: 'Phone' },
              { id: 'tablet', Icon: TabletIcon, label: 'Tablet' },
              { id: 'desktop', Icon: LaptopIcon, label: 'Desktop' },
            ] as const).map(({ id, Icon, label }) => (
              <button
                key={id}
                type='button'
                onClick={() => setDevice(id)}
                aria-label={`${label} view`}
                aria-pressed={device === id}
                title={`${label} view`}
                className={`rounded p-1 transition-colors ${device === id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                <Icon className='size-5' />
              </button>
            ))}
          </div>
          {}
          <div className='flex items-center justify-end gap-3 flex-1 text-xs
          sm:text-sm'>
            <button onClick={saveProject} disabled={isSaving} className='max-sm:hidden bg-gray-800
            hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2
            rounded sm:rounded-sm transition-colors border border-gray-700'>
              {isSaving ? <Loader2Icon className='animate-spin' size={16}/> :
             <SaveIcon size={16}/>} Save
            </button>
            <Link target='_blank' rel='noopener noreferrer' to={`/preview/${projectId}`} className='flex
            items-center gap-2 px-4 py-1 rounded sm:rounded-sm border
            border-gray-700 hover:border-gray-500 transition-colors'>
             <FullscreenIcon size={16} /> Preview
            </Link>
            <button onClick={copyCode} className='max-sm:hidden bg-gray-800
            hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2
            rounded sm:rounded-sm transition-colors border border-gray-700'>
              <CopyIcon size={16}/> Copy HTML
            </button>
            <button onClick={regenerate} disabled={isGenerating} className='max-sm:hidden bg-gray-800
            hover:bg-gray-700 text-white px-3.5 py-1 flex items-center gap-2
            rounded sm:rounded-sm transition-colors border border-gray-700 disabled:opacity-60'>
              <RefreshCwIcon size={16}/> Regenerate
            </button>
            <button onClick={downloadCode} className='bg-linear-to-br from-blue-700 to-blue-600
            hover:from-blue-600 hover:to-blue-500 text-white px-3.5 py-1 flex
            items-center gap-2 rounded sm:rounded-sm transition-colors'>
              <ArrowBigDownDashIcon size={16}/>  Download
            </button>
            <button onClick={togglePublish} className='bg-linear-to-br from-indigo-700 to-indigo-600
            hover:from-indigo-600 hover:to-indigo-500 text-white px-3.5 py-1 flex
            items-center gap-2 rounded sm:rounded-sm transition-colors'>
              {project.isPublished ?
              <EyeOffIcon size={16}/> : <EyeIcon size={16}/>}
              {
                project.isPublished ? "Unpublish" : "Publish" 
              }
            </button>
          </div>
        </div>
        <div className='flex-1 flex overflow-auto'>
          <Sidebar isMenuOpen={isMenuOpen} project={project} setProject={(p)=>
            setProject(p)} isGenerating={isGenerating} setIsGenerating={setIsGenerating}
            activePath={activeFile}
          />
          <div className='flex-1 p-2 p1-0'>
            <ProjectPreview ref={previewRef} project={project}
            isGenerating={isGenerating} device={device} streamingHtml={streamHtml}
            statusText={genStatus}
            activeFile={activeFile} onActiveFileChange={setActiveFile}
            onGenerate={startGeneration} onCancel={cancelGeneration} />
          </div>
        </div>
    </div>
  )
  :
  (
    <div className='flex flex-col items-center justify-center gap-5 h-screen text-center px-4'>
      <p className="text-2xl font-medium text-gray-200">Unable to load project</p>
      <button
        onClick={() => navigate('/projects')}
        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-indigo-500/40 active:scale-95 smooth-transition"
      >
        Back to my projects
      </button>
    </div>
  )
}

export default Projects