import { useEffect, useState } from 'react'
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

    useEffect(() => {
      if (!menuOpen) return;
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
      };
    }, [menuOpen]);

  return (
    <>
    <nav className={`sticky top-0 z-50 flex items-center justify-between w-full py-4 px-4 md:px-16 lg:px-24 xl:px-32 text-white smooth-transition ${
        scrolled
          ? 'bg-[#0e0e13]/80 backdrop-blur-xl border-b border-zinc-800'
          : 'bg-transparent border-b border-transparent'
      }`}>
        <Link to='/' className="group flex items-center gap-2 smooth-transition">
              <img src={assets.logo} alt="logo" className='h-5 sm:h-7 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(129,140,248,0.6)] smooth-transition'/>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
              return (
                <Link key={link.to} to={link.to} aria-current={active ? 'page' : undefined} className={`relative group smooth-transition ${active ? 'text-white' : 'text-gray-300 hover:text-white'}`}>
                  <span>{link.label}</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400 smooth-transition ${active ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            {!session?.user ? (
                <button onClick={()=> navigate('/auth/signin')} className="px-5 py-2 max-sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-500 active:scale-95 smooth-transition rounded-lg animate-scale-in">
                Get started
              </button>
            ) : (
              <>
              <Link to='/pricing' aria-label={`${credits} credits remaining — view pricing`} className='bg-zinc-900 px-4 py-1.5 text-xs sm:text-sm border border-zinc-800 text-gray-300 rounded-md hover:border-zinc-700 hover:text-white smooth-transition animate-scale-in'>
                Credits: <span className='text-indigo-300 font-semibold'>{credits}</span>
              </Link>
              <div className="animate-scale-in animate-delay-200">
                <UserButton size='icon' />
              </div>
              </>
            )}
          <button
              id="open-menu"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden -mr-2 p-2 active:scale-90 transition"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon className="size-6" />
            </button>
          </div>
        </nav>

        {}
        {menuOpen && (
          <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu" className="fixed inset-0 z-[100] bg-black/80 text-white backdrop-blur-xl flex flex-col items-center justify-center text-lg gap-8 md:hidden animate-fade-in">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="hover:text-indigo-400 smooth-transition">
                {link.label}
              </Link>
            ))}
            <button aria-label="Close menu" className="active:scale-90 size-11 p-1 items-center justify-center glass hover:bg-white/10 transition rounded-lg flex mt-4" onClick={() => setMenuOpen(false)} >
              <XIcon className="size-6" />
            </button>
          </div>
        )}

    </>
  )
}

export default Navbar
