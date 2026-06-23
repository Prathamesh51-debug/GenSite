import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Loader2Icon } from 'lucide-react';

const Spline = lazy(() => import('@splinetool/react-spline'));

const Fallback = () => (
  <div className="flex items-center justify-center w-full h-full" role="status" aria-label="Loading 3D scene">
    <Loader2Icon className="size-7 animate-spin text-indigo-400" />
  </div>
);

interface SplineSceneProps {
  
  scene: string;
  className?: string;
  
  lazyMount?: boolean;
  onLoad?: () => void;
  
  hideWatermark?: boolean;
}

const SplineScene = ({ scene, className = '', lazyMount = false, onLoad, hideWatermark = true }: SplineSceneProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(!lazyMount);

  useEffect(() => {
    if (!lazyMount || show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [lazyMount, show]);

  return (
    <div
      ref={ref}
      className={className}
      style={hideWatermark ? { overflow: 'hidden' } : undefined}
    >
      {show ? (
        <Suspense fallback={<Fallback />}>
          <div style={hideWatermark ? { width: 'calc(100% + 180px)', height: 'calc(100% + 60px)', position: 'absolute', top: 0, left: 0 } : { width: '100%', height: '100%' }}>
            <Spline scene={scene} onLoad={onLoad} style={{ width: '100%', height: '100%' }} />
          </div>
        </Suspense>
      ) : (
        <Fallback />
      )}
    </div>
  );
};

export default SplineScene;
