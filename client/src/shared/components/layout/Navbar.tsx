import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authClient } from '@/shared/api/auth-client';
import { MenuIcon, XIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useCredits } from '@/features/billing/hooks/use-credits';
import { useTheme } from '@/shared/lib/theme';

const UserMenu = lazy(() => import('@/features/auth/components/UserMenu'));

const UserMenuSlot = () => (
  <Suspense fallback={<span className="block size-8 rounded-full bg-secondary" aria-hidden="true" />}>
    <UserMenu />
  </Suspense>
);

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'My Projects', to: '/projects' },
  { label: 'Community', to: '/community' },
  { label: 'Pricing', to: '/pricing' },
];

const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`grid place-items-center size-9 rounded-full border border-border bg-card text-foreground/80 hover:text-primary hover:border-primary/50 smooth-transition ${className}`}
    >
      {theme === 'dark' ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  );
};

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
    <nav className={`sticky top-0 z-50 flex items-center justify-between w-full py-3.5 px-4 md:px-16 lg:px-24 xl:px-32 text-foreground smooth-transition ${
        scrolled
          ? 'bg-card/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent'
      }`}>
        <Link to='/' className="group flex items-center gap-2.5 smooth-transition">
          <span className="size-4 rounded-full bg-primary group-hover:scale-110 smooth-transition" />
          <span className="font-display text-xl font-extrabold tracking-tight text-primary">GenSite</span>
        </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const active = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
              return (
                <Link key={link.to} to={link.to} aria-current={active ? 'page' : undefined} className={`relative group text-[15px] smooth-transition ${active ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}>
                  <span>{link.label}</span>
                  <span className={`absolute -bottom-1.5 left-0 h-0.5 rounded-full bg-clay smooth-transition ${active ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle className="max-sm:hidden" />
            {!session?.user ? (
                <button onClick={()=> navigate('/auth/signin')} className="px-5 py-2 max-sm:text-sm font-semibold bg-primary text-primary-foreground rounded-organic-sm shadow-sticker-strong tilt-right hover:brightness-105 active:scale-95 smooth-transition animate-scale-in">
                Get started
              </button>
            ) : (
              <>
              <Link to='/pricing' aria-label={credits == null ? 'View pricing' : `${credits} credits remaining — view pricing`} className='bg-card px-4 py-1.5 text-xs sm:text-sm border border-border text-muted-foreground rounded-full hover:border-primary/50 hover:text-foreground smooth-transition animate-scale-in'>
                Credits: <span className='text-clay font-semibold'>{credits ?? '—'}</span>
              </Link>
              <div className="animate-scale-in animate-delay-200">
                <UserMenuSlot />
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

        {menuOpen && (
          <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Main menu" className="fixed inset-0 z-[100] bg-background/95 text-foreground backdrop-blur-xl flex flex-col items-center justify-center text-lg gap-8 md:hidden animate-fade-in">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className="hover:text-primary smooth-transition">
                {link.label}
              </Link>
            ))}

            {/* Account / credits — so logged-in users can see their balance and sign out from mobile */}
            {session?.user ? (
              <div className="flex items-center gap-4">
                <Link to="/pricing" onClick={() => setMenuOpen(false)} className="bg-card px-4 py-1.5 text-sm border border-border text-muted-foreground rounded-full">
                  Credits: <span className="text-clay font-semibold">{credits ?? '—'}</span>
                </Link>
                <UserMenuSlot />
              </div>
            ) : (
              <button
                onClick={() => { setMenuOpen(false); navigate('/auth/signin'); }}
                className="px-5 py-2 text-base font-semibold bg-primary text-primary-foreground rounded-organic-sm shadow-sticker-strong tilt-right active:scale-95 smooth-transition"
              >
                Get started
              </button>
            )}

            <div className="flex items-center gap-3 mt-2">
              <ThemeToggle />
              <button ref={closeBtnRef} aria-label="Close menu" className="active:scale-90 size-11 p-1 items-center justify-center border border-border bg-card hover:border-primary/50 transition rounded-full flex" onClick={() => setMenuOpen(false)} >
                <XIcon className="size-6" />
              </button>
            </div>
          </div>
        )}

    </>
  )
}

export default Navbar
