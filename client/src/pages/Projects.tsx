import  { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type Project } from '../types'
import {
  ArrowBigDownDashIcon,
  EyeIcon,
  EyeOffIcon,
  FullscreenIcon,
  LaptopIcon,
  Loader2Icon,
  MessageSquareIcon,
  SaveIcon,
  SmartphoneIcon,
  TabletIcon,
  XIcon,
} from 'lucide-react'

import Sidebar from '../components/Sidebar'
import ProjectPreview from '../components/ProjectPreview'
import type { ProjectPreviewRef } from '../components/ProjectPreview'
import api from '@/configs/axios'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'


const Projects = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const {data: session, isPending, error} = authClient.useSession()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const [isGenerating, setIsGenerating] = useState(true)
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop')

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

   const previewRef =useRef<ProjectPreviewRef>(null)

   const [streamHtml, setStreamHtml] = useState('')
   const streamedRef = useRef<string | null>(null)

   const fetchProject =async () => {
   try {
    const { data } = await api.get(`/api/user/project/${projectId}`);
    setProject(data.project)
    setIsGenerating(data.project.current_code ? false: true)
    setLoading(false)
   }catch(error: any){
    toast.error(error?.response?.data?.message || error.message);
    console.log(error);
   }
  }

   const saveProject = async () => {
    if(!previewRef.current) return;
    const code = previewRef.current.getCode();
    if(!code) return;
    setIsSaving(true);
    try {
      const {data} = await api.put(`/api/project/save/${projectId}`,{code});
      toast.success(data.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      console.log(error);
    }finally{
      setIsSaving(false);
    }
   };

   const downloadCode = () =>{
    const code =previewRef.current?.getCode() || project?.current_code;
    if(!code){
      if(isGenerating){
        return
      }
      return
    }
    const element = document.createElement('a');
    const file =new Blob([code], {type: "text/html"});
    element.href = URL.createObjectURL(file)
    element.download = 'index.html'
    document.body.appendChild(element)
    element.click();
   }

   const togglePublish = async () => {
    try {
      const {data} = await api.get(`/api/user/publish-toggle/${projectId}`);
      toast.success(data.message)
      setProject((prev)=> prev ? ({...prev, isPublished : !prev.isPublished}): null)
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
   },[session?.user, isPending, error])

  useEffect(() => {
    if (!project?.id || project.current_code) return;
    if (streamedRef.current === project.id) return;
    streamedRef.current = project.id;

    const base = import.meta.env.VITE_BASEURL || 'http://localhost:3000';
    const es = new EventSource(`${base}/api/project/stream/${project.id}`, { withCredentials: true });

    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'chunk') {
          setStreamHtml(d.html);
        } else if (d.type === 'done') {
          es.close();
          setStreamHtml('');
          fetchProject();
        } else if (d.type === 'error') {
          es.close();
          setStreamHtml('');
          setIsGenerating(false);
          toast.error(d.message || 'Generation failed');
          fetchProject();
        }
      } catch {  }
    };
    es.onerror = () => {
      es.close();
      fetchProject();
    };

    return () => es.close();
  }, [project?.id, project?.current_code])
    


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
            <img src="/favicon.svg" alt='logo' className='h-6 cursor-pointer' 
            onClick={()=>navigate('/')}/>
            <div className='max-w-64 sm:max-w-xs'>
              <p className='text-sm font-medium capitalize truncate'>{project.name}</p>
              <p className='text-xs text-gray-400 -mt-0.5'>Previewing last saved version</p>
            </div>
            <div className='sm:hidden flex-1 flex justify-end'>
              <button
                type='button'
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? 'Show preview' : 'Show chat'}
                className='p-1 text-gray-300 hover:text-white transition-colors'
              >
                {isMenuOpen ? <MessageSquareIcon className='size-6'/> : <XIcon className='size-6'/>}
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
            <Link target='_blank' to={`/preview/${projectId}`} className='flex
            items-center gap-2 px-4 py-1 rounded sm:rounded-sm border
            border-gray-700 hover:border-gray-500 transition-colors'>
             <FullscreenIcon size={16} /> Preview
            </Link>
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
          />
          <div className='flex-1 p-2 p1-0'>
            <ProjectPreview ref={previewRef} project={project}
            isGenerating={isGenerating} device={device} streamingHtml={streamHtml} />
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