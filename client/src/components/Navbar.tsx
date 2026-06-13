import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { assets } from '../assets/assets';
import { authClient } from '@/lib/auth-client';
import { UserButton } from '@daveyplate/better-auth-ui'
import api from '@/configs/axios';
import { toast } from 'sonner';
import { MenuIcon, XIcon } from 'lucide-react';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'My Projects', to: '/projects' },
  { label: 'Community', to: '/community' },
  { label: 'Pricing', to: '/pricing' },
];

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [credits, setCredits] = useState(0)

    const {data: session} = authClient.useSession()

    const getCredits = async () => {
      try {
        const {data} =await api.get('/api/user/credits');
        setCredits(data.credits)
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error.message)
        console.log(error);
      }
    }

    useEffect(()=>{
      if(session?.user){
        getCredits()
      }
    },[session?.user])

    useEffect(() => {
      const onScroll = () => setScrolled(window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

  return (
    <>
    <nav className={`sticky top-0 z-50 flex items-center justify-between w-full py-4 px-4 md:px-16 lg:px-24 xl:px-32 text-white smooth-transition ${
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}>
        <Link to='/' className="group flex items-center gap-2 smooth-transition">
              <img src={assets.logo} alt="logo" className='h-5 sm:h-7 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(129,140,248,0.6)] smooth-transition'/>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
              return (
                <Link key={link.to} to={link.to} className={`relative group smooth-transition ${active ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                  <span>{link.label}</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-indigo-400 to-fuchsia-400 smooth-transition ${active ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {!session?.user ? (
                <button onClick={()=> navigate('/auth/signin')} className="px-5 py-2 max-sm:text-sm font-medium bg-gradient-to-r from-fuchsia-500 to-indigo-600 active:scale-95 hover:shadow-lg hover:shadow-indigo-500/40 smooth-transition rounded-lg animate-scale-in">
                Get started
              </button>
            ) : (
              <>
              <button className='bg-white/10 px-5 py-1.5 text-xs sm:text-sm border border-indigo-500/30 text-gray-200 rounded-full hover:bg-white/20 hover:border-indigo-500/50 smooth-transition animate-scale-in'>
                Credits: <span className='text-indigo-300 font-semibold'>{credits}</span>
              </button>
              <div className="animate-scale-in animate-delay-200">
                <UserButton size='icon' />
              </div>
              </>
            )}
          <button id="open-menu" className="md:hidden active:scale-90 transition" onClick={() => setMenuOpen(true)} >
              <MenuIcon className="size-6" />
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 text-white backdrop-blur-xl flex flex-col items-center justify-center text-lg gap-8 md:hidden animate-fade-in">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="hover:text-indigo-400 smooth-transition">
                {link.label}
              </Link>
            ))}
            <button className="active:scale-90 size-11 p-1 items-center justify-center glass hover:bg-white/10 transition rounded-lg flex mt-4" onClick={() => setMenuOpen(false)} >
              <XIcon className="size-6" />
            </button>
          </div>
        )}

         {/* BACKGROUND IMAGE */}
         <img src="https://raw.githubusercontent.com/prebuiltui/prebuiltui/refs/heads/main/assets/hero/bg-gradient-2.png" className="fixed inset-0 -z-10 w-full h-full object-cover opacity-60" alt="" />

    </>
  )
}

export default Navbar
