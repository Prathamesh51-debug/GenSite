import React, { useEffect, useRef, useState } from 'react'
import type { Message, Project, Version } from '@/types';
import { BotIcon, EyeIcon, Loader2Icon, SendIcon, UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/shared/api/axios';
import { toast } from 'sonner';
import { emitCreditsChanged } from '@/features/billing/lib/credits-bus';
import { useCredits } from '@/features/billing/hooks/use-credits';
import { useConfirm } from '@/shared/components/ui/ConfirmDialog';

interface SidebarProps {
    isMenuOpen: boolean;
    project: Project,
    setProject: (project: Project)=> void;
    isGenerating : boolean;
    setIsGenerating: (isGenerating: boolean)=> void;
    /** The page currently open in the preview — chat edits target this page. */
    activePath?: string;
}

const Sidebar = ({isMenuOpen, project, setProject, isGenerating, setIsGenerating, activePath}: SidebarProps) => {
  
    const messageRef = useRef<HTMLDivElement>(null)
    const revisionTimer = useRef<ReturnType<typeof setInterval> | null>(null)
    const [input, setInput] = useState('')
    const credits = useCredits()
    const creditsLoading = credits === null
    const insufficient = credits !== null && credits < 5
    const confirm = useConfirm()

    // Clear any in-flight revision poll if the editor unmounts mid-request.
    useEffect(() => () => { if (revisionTimer.current) clearInterval(revisionTimer.current) }, [])

    const fetchProject =async () => {
      try {
        const { data } = await api.get(`/api/user/project/${project.id}`)
        setProject(data.project)
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error.message);
        console.log(error);
      }
      
    }

    const handleRollback =async (VersionId: string) =>{
        try {
          const ok = await confirm({
            title: 'Roll back to this version?',
            message: 'This restores the selected version as your current site. You can roll forward again from history.',
            confirmText: 'Roll back',
          })
          if(!ok) return;
          setIsGenerating(true)
          const {data} = await api.post(`/api/project/rollback/${project.id}/${VersionId}`);
          const { data: data2} =await api.get(`/api/user/project/${project.id}`);
          toast.success(data.message)
          setProject(data2.project)
          setIsGenerating(false)

        } catch (error: any) {
          setIsGenerating(false)
          toast.error(error?.response?.data?.message || error.message);
          console.log(error);
        }
    }

    const clearRevisionTimer = () => {
      if (revisionTimer.current) { clearInterval(revisionTimer.current); revisionTimer.current = null }
    }

    const handleRevisions = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
          setIsGenerating(true);
          revisionTimer.current = setInterval(()=>{
            fetchProject();
          },10000)
          const {data} = await api.post(`/api/project/revision/${project.id}`,
            {message: input, path: activePath}
          )
          fetchProject();
          emitCreditsChanged();
          toast.success(data.message)
          setInput('')
          clearRevisionTimer()
          setIsGenerating(false)
        } catch (error: any) {
          setIsGenerating(false)
          toast.error(error?.response?.data?.message || error.message);
          console.error(error);
          clearRevisionTimer()
        }
    }


  useEffect(()=>{
    if(messageRef.current){
        messageRef.current.scrollIntoView({behavior:'smooth'})
    }
  },[project.conversation.length, isGenerating])

    // Number versions in chronological order for readable labels ("Version 3").
    const versionNumbers = new Map(project.versions.map((v, i) => [v.id, i + 1]))

    return (
    <div
      className={`h-full sm:max-w-sm rounded-xl bg-card border border-border transition-all ${
        isMenuOpen ? 'max-sm:w-0 overflow-hidden' : 'w-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* message container */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col gap-4">
          {[...project.conversation, ...project.versions]
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .map((message) => {
              const isMessage = 'content' in message;

              if (isMessage) {
                const msg = message as Message;
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <BotIcon className="size-5 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-2 px-4 rounded-2xl shadow-sm text-sm mt-5 leading-relaxed ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                          : 'rounded-tl-none bg-secondary text-foreground'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <UserIcon className="size-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              }
              else{
                const ver = message as Version;
                return (
                    <div key={ver.id} className='w-4/5 mx-auto my-2 p-3
                    rounded-xl bg-secondary text-foreground shadow flex flex-col
                    gap-2'>
                        <div className='text-xs font-medium'>
                            Version {versionNumbers.get(ver.id)}
                            {ver.description ? <span className='text-muted-foreground font-normal'> · {ver.description}</span> : null}
                            <br />
                            <span className='text-muted-foreground text-xs font-normal'>
                                {new Date(ver.timestamp).toLocaleString()}
                            </span>
                        </div>
                        <div className='flex items-center justify-between'>
                            {project.current_version_index === ver.id ? (
                                <button className='px-3 py-1 rounded-md text-xs
                                bg-muted text-muted-foreground'>Current version</button>
                            ) : (
                                <button onClick={()=> handleRollback(ver.id)} className='px-3 py-1 rounded-md text-xs
                                bg-primary hover:brightness-105
                                text-primary-foreground'>Roll back to this version</button>
                            )}
                            <Link target='_blank' rel='noopener noreferrer' to={`/preview/${project.id}/${ver.id}`}>
                            <EyeIcon className='size-6 p-1 bg-muted text-muted-foreground
                            hover:bg-primary hover:text-primary-foreground transition-colors rounded'/>
                            </Link>
                        </div>

                    </div>
                )
              }
            })}
            {isGenerating &&(
                <div className='flex items-start gap-3 justify-start'>
                    <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center'>
                        <BotIcon className='size-5 text-primary-foreground'/>
                    </div>

                    <div className='flex gap-1.5 h-full items-end'>
                        <span className='size-2 rounded-full animate-bounce
                        bg-muted-foreground/50' style={{animationDelay:'0s'}}/>
                        <span className='size-2 rounded-full animate-bounce
                        bg-muted-foreground/50' style={{animationDelay:'0.2s'}}/>
                        <span className='size-2 rounded-full animate-bounce
                        bg-muted-foreground/50' style={{animationDelay:'0.4s'}}/>

                    </div>

                </div>
            )

            }
            <div ref={messageRef}/>
        </div>
        {/* input area */}
        <form onSubmit={handleRevisions} className='m-3 relative'>
            <div className='flex items-center justify-between mb-1.5 px-1'>
              {insufficient ? (
                <Link to='/pricing' className='text-[11px] font-medium text-amber-500 hover:text-amber-400'>Low on credits — top up</Link>
              ) : (
                <span className='text-[11px] text-muted-foreground'>Each change costs 5/20 credits</span>
              )}
            </div>
            <div className='flex items-center gap-2'>
                <textarea onChange={(e)=>setInput(e.target.value)} value={input} rows={4}
                maxLength={2000}
                aria-label='Describe your website or request changes'
                onKeyDown={(e)=>{ if(e.key==='Enter' && !e.shiftKey && !e.nativeEvent.isComposing){ e.preventDefault(); if(input.trim() && !isGenerating && !insufficient && !creditsLoading) e.currentTarget.form?.requestSubmit(); } }}
                placeholder='Describe a change… (Enter to send, Shift+Enter for a new line)' className='flex-1 p-3 rounded-xl resize-none text-sm
                outline-none ring-1 ring-border focus:ring-2 focus:ring-primary bg-secondary
                text-foreground placeholder:text-muted-foreground transition-all' disabled={isGenerating} />
                <button disabled={isGenerating || !input.trim() || insufficient || creditsLoading} className='absolute bottom-2.5 right-2.5 rounded-full
                bg-primary hover:brightness-105 text-primary-foreground transition-colors
                disabled:opacity-60'>
                    {isGenerating
                        ? <Loader2Icon className='size-7 p-1.5 animate-spin'/>
                        : <SendIcon className='size-7 p-1.5'/>
                    }
                </button>
            </div>

        </form>
      </div>
    </div>
  );
};

export default Sidebar