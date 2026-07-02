
import { Suspense, lazy, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Navbar from '@/shared/components/Navbar';
import SplashCursor from '@/shared/ui/reactbits/SplashCursor';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { isLowPowerDevice } from '@/shared/lib/device';
import { Toaster } from 'sonner'

gsap.registerPlugin(ScrollTrigger);

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
  const reduceMotion = useReducedMotion()

  // The fluid-cursor sim is a desktop pointer effect — pointless and battery-
  // draining on touch devices, and unwanted under reduced-motion.
  const [finePointer, setFinePointer] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const update = () => setFinePointer(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  // The fluid-cursor sim is a continuous WebGL simulation — skip it entirely on
  // low-power devices (no dedicated GPU / low memory), where it's the worst offender.
  const showCursorFx = finePointer && !reduceMotion && !isLowPowerDevice()

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

    lenis.on('scroll', ScrollTrigger.update);
    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div>
    <Toaster position="top-center" richColors closeButton theme="dark" />
      {}
      {showCursorFx && (
        <div className="opacity-40">
          <SplashCursor DENSITY_DISSIPATION={5} SPLAT_RADIUS={0.15} SPLAT_FORCE={4500} />
        </div>
      )}
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
