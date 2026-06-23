
import { Suspense, lazy, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Loader2Icon } from 'lucide-react';
import { MotionConfig } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import SplashCursor from './components/reactbits/SplashCursor';
import { Toaster } from 'sonner'

gsap.registerPlugin(ScrollTrigger);

const Home = lazy(() => import('./pages/Home'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Projects = lazy(() => import('./pages/Projects'));
const MyProjects = lazy(() => import('./pages/MyProjects'));
const Preview = lazy(() => import('./pages/Preview'));
const Community = lazy(() => import('./pages/Community'));
const View = lazy(() => import('./pages/View'));
const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const Settings = lazy(() => import('./pages/Settings'));
const Loading = lazy(() => import('./pages/Loading'));

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
    <Toaster />
      {}
      <div className="opacity-40">
        <SplashCursor DENSITY_DISSIPATION={5} SPLAT_RADIUS={0.15} SPLAT_FORCE={4500} />
      </div>
      {!hideNavbar && <Navbar />}

      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/pricing' element={<Pricing />} />
        <Route path='/projects/:projectId' element={<Projects />} />
        <Route path='/projects' element={<MyProjects />} />
        <Route path='/preview/:projectId' element={<Preview />} />
        <Route path='/preview/:projectId/:VersionId' element={<Preview />} />
        <Route path='/community' element={<Community />} />
        <Route path='/view/:projectId' element={<View />} />
        <Route path="/auth/:pathname" element={<AuthPage />} />
        <Route path="/account/settings" element={<Settings />} />
        <Route path='/loading' element={<Loading />}/>
      </Routes>
      </Suspense>
    </div>
    </MotionConfig>
  );
};

export default App;
