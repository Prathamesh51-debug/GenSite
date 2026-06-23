import { Loader2Icon } from 'lucide-react'
import { useEffect } from 'react'

const Loading = () => {

    useEffect(()=>{
        setTimeout(()=>{
            window.location.href = '/'
        },6000)
    },[])

    
  return (
    <div className='h-screen flex flex-col'>
        <div className='flex flex-col items-center justify-center gap-3 flex-1' role='status' aria-label='Loading'>
            <Loader2Icon className='size-7 animate-spin text-indigo-200'/>
            <p className='text-sm text-gray-400'>Redirecting…</p>
        </div>
    </div>
  )
}

export default Loading