import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authClient } from '@/shared/api/auth-client';
import { UserButton } from '@daveyplate/better-auth-ui'
import { MenuIcon, XIcon } from 'lucide-react';
import { useCredits } from '@/features/billing/use-credits';

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
    const openBtnRef = useRef<HTMLButtonElement>(null)
    const closeBtnRef = useRef<HTMLButtonElement>(null)

    const {data: session} = authClient.useSession()
    // Live balance via the shared hook (single source of truth; auto-refreshes on
    // any credits change). Returns null until loaded.
    const credits = useCredits()

    useEffect(() => {
      const onScroll = () => setScrolled(window.scrollY > 12);
      onScroll();
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
      if (!menuOpen) return;
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') { setMenuOpen(false); return; }
        if (e.key === 'Tab') {
          // Trap focus within the open dialog.
          const menu = document.getElementById('mobile-menu');
          const focusables = menu?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
          if (!focusables || focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
      // Move focus into the dialog on open; restore it to the trigger on close.
      closeBtnRef.current?.focus();
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', onKey);
        openBtnRef.current?.focus();
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
              <img src="/logo.png" alt="GenSite" className='h-5 sm:h-7 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(129,140,248,0.6)] smooth-transition'/>
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
              <Link to='/pricing' aria-label={credits == null ? 'View pricing' : `${credits} credits remaining — view pricing`} className='bg-zinc-900 px-4 py-1.5 text-xs sm:text-sm border border-zinc-800 text-gray-300 rounded-md hover:border-zinc-700 hover:text-white smooth-transition animate-scale-in'>
                Credits: <span className='text-indigo-300 font-semibold'>{credits ?? '—'}</span>
              </Link>
              <div className="animate-scale-in animate-delay-200">
                <UserButton size='icon' />
              </div>
              </>
            )}
          <button
              ref={openBtnRef}
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

            {/* Account / credits — so logged-in users can see their balance and sign out from mobile */}
            {session?.user ? (
              <div className="flex items-center gap-4">
                <Link to="/pricing" onClick={() => setMenuOpen(false)} className="bg-zinc-900 px-4 py-1.5 text-sm border border-zinc-800 text-gray-300 rounded-md">
                  Credits: <span className="text-indigo-300 font-semibold">{credits ?? '—'}</span>
                </Link>
                <UserButton size="icon" />
              </div>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); navigate('/auth/signin'); }}
                className="px-5 py-2 text-base font-medium bg-indigo-600 hover:bg-indigo-500 active:scale-95 smooth-transition rounded-lg"
              >
                Get started
              </button>
            )}

            <button ref={closeBtnRef} aria-label="Close menu" className="active:scale-90 size-11 p-1 items-center justify-center glass hover:bg-white/10 transition rounded-lg flex mt-4" onClick={() => setMenuOpen(false)} >
              <XIcon className="size-6" />
            </button>
          </div>
        )}

    </>
  )
}

export default Navbar
