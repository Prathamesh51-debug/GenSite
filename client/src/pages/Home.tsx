import api from '@/configs/axios';
import { authClient } from '@/lib/auth-client';
import { Loader2Icon } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Home = () => {

  const {data: session}= authClient.useSession()

  const navigate = useNavigate()

  const [input, setInput] = useState('');
  const [loading,setLoading]=useState(false)

  const onSubmitHandler = async (e:React.FormEvent) => {
    e.preventDefault();
    try {
      if(!session?.user){
        return toast.error('Please sign in to create a project')
      }else if(!input.trim()){
        return toast.error('Please enter a message')
      }setLoading(true)
      const {data} = await api.post('/api/user/project', {initial_prompt: input});
      setLoading(false);
      navigate(`/projects/${data.projectId}`)
    } catch (error: any) {
      setLoading(false);
      toast.error(error?.response?.data?.message || error.message);
    }
  }

    

   

  return (

      <section className="flex flex-col items-center text-white text-sm pb-20 px-4 font-poppins relative overflow-hidden">
          
        <a href="https://prebuiltui.com" className="flex items-center gap-2 border border-slate-700 rounded-full p-1 pr-3 text-sm mt-20 animate-fade-in-down hover:border-indigo-500 hover:bg-white/5 smooth-transition">
          <span className="bg-indigo-600 text-xs px-3 py-1 rounded-full animate-pulse-glow">NEW</span>
          <p className="flex items-center gap-2">
            <span>Try 30 days free trial option</span>
            <svg className="mt-px smooth-transition group-hover:translate-x-1" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m1 1 4 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </p>
        </a>

        <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl animate-fade-in-up animate-delay-200">
          Turn thoughts into websites instantly, with AI.
        </h1>

        <p className="text-center text-base max-w-md mt-2 animate-fade-in-up animate-delay-300 text-gray-300">
          Create, customize and publish website faster than ever with our AI Site Builder.
        </p>

        <form onSubmit={onSubmitHandler} className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-400 transition-all animate-fade-in-up animate-delay-400 hover:bg-white/15 hover:shadow-lg hover:shadow-indigo-500/20 smooth-transition">
          <textarea onChange={e => setInput(e.target.value)} className="bg-transparent outline-none text-gray-300 resize-none w-full placeholder:text-gray-500 smooth-transition" rows={4} placeholder="Describe your presentation in details" required />
          <button className="ml-auto flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-4 py-2 hover:from-[#CB52D4] hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/50 active:scale-95 smooth-transition animate-gradient">
            {!loading ? 'Create with AI' :(
              <>
              Creating <Loader2Icon className='animate-spin size-4 text-white'/>
              </>
            )}
            
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-16 md:gap-20 mx-auto mt-16 animate-fade-in-up animate-delay-500">
          <img className="max-w-28 md:max-w-32 opacity-60 hover:opacity-100 hover:scale-110 smooth-transition animate-float" style={{animationDelay: '0s'}} src="https://saasly.prebuiltui.com/assets/companies-logo/framer.svg" alt="" />
          <img className="max-w-28 md:max-w-32 opacity-60 hover:opacity-100 hover:scale-110 smooth-transition animate-float" style={{animationDelay: '0.3s'}} src="https://saasly.prebuiltui.com/assets/companies-logo/huawei.svg" alt="" />
          <img className="max-w-28 md:max-w-32 opacity-60 hover:opacity-100 hover:scale-110 smooth-transition animate-float" style={{animationDelay: '0.6s'}} src="https://saasly.prebuiltui.com/assets/companies-logo/instagram.svg" alt="" />
          <img className="max-w-28 md:max-w-32 opacity-60 hover:opacity-100 hover:scale-110 smooth-transition animate-float" style={{animationDelay: '0.9s'}} src="https://saasly.prebuiltui.com/assets/companies-logo/microsoft.svg" alt="" />
          <img className="max-w-28 md:max-w-32 opacity-60 hover:opacity-100 hover:scale-110 smooth-transition animate-float" style={{animationDelay: '1.2s'}} src="https://saasly.prebuiltui.com/assets/companies-logo/walmart.svg" alt="" />
        </div>
      </section>

  );
};

export default Home;