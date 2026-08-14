
import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import Lenis from 'lenis';
import Navbar from '@/shared/components/Navbar';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { Toaster } from 'sonner'

const Home = lazy(() => import('@/pages/Home'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Projects = lazy(() => import('@/pages/Projects'));
const MyProjects = lazy(() => import('@/pages/MyProjects'));
const Preview = lazy(() => import('@/pages/Preview'));
const Community = lazy(() => import('@/pages/Community'));
const View = lazy(() => import('@/pages/View'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));
const Settings = lazy(() => import('@/pages/Settings'));
const Loading = lazy(() => import('@/pages/Loading'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Terms = lazy(() => import('@/pages/Terms'));
const Privacy = lazy(() => import('@/pages/Privacy'));

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]" role="status" aria-label="Loading page">
    <Loader2Icon className="size-7 animate-spin text-primary" />
  </div>
);

const App  = () => {

  const { pathname } = useLocation()

  const hideNavbar=pathname.startsWith('/projects/') && pathname !== '/projects'
                   || pathname.startsWith('/view/')
                   || pathname.startsWith('/preview/')

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      lerp: 0.09,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });

    // Lenis used to be driven by GSAP's ticker purely so ScrollTrigger stayed in
    // sync. With GSAP gone, it drives itself off rAF — note native rAF already
    // reports milliseconds, so there's no *1000 here as there was for gsap.ticker
    // (whose time is in seconds). Scroll reveals are framer-motion's `whileInView`
    // now, which reads real scroll position and needs no sync step.
    let frame = requestAnimationFrame(function raf(time: number) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div>
    <Toaster position="top-center" richColors closeButton theme="dark" />
      <ErrorBoundary>
      {!hideNavbar && <Navbar />}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/pricing' element={<Pricing />} />
        <Route path='/projects/:projectId' element={<Projects />} />
        <Route path='/projects' element={<MyProjects />} />
        <Route path='/preview/:projectId' element={<Preview />} />
        <Route path='/preview/:projectId/:versionId' element={<Preview />} />
        <Route path='/community' element={<Community />} />
        <Route path='/view/:projectId' element={<View />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path='/loading' element={<Loading />}/>
        <Route path='/terms' element={<Terms />} />
        <Route path='/privacy' element={<Privacy />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </div>
    </MotionConfig>
  );
};

export default App;
