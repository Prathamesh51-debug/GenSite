// Best-effort "should we run the heavy hero WebGL" probe.
//
// The hero stacks a Spline 3D scene, an Aurora shader, a particle field and a
// fluid-cursor simulation. We now only fall back to the lightweight gradients when
// the device *genuinely* can't/shouldn't render them: the user asked for less motion
// or less data, or WebGL is entirely unavailable.
//
// The old RAM / CPU-core / software-renderer heuristics were dropped — they were far
// too aggressive: navigator.deviceMemory is capped at 8 and commonly *reports* 4 on
// perfectly capable laptops, hardwareConcurrency <= 4 catches plenty of real
// machines, and the software-renderer check killed all effects whenever a browser
// had hardware acceleration disabled. Net effect: effects vanished on hardware that
// runs them fine.
//
// Result is cached — the WebGL probe allocates a context.
let cached: boolean | null = null;

export const isLowPowerDevice = (): boolean => {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return (cached = false);
  }

  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };

  // Explicit user/OS signals win outright (accessibility + data saving).
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return (cached = true);
  if (nav.connection?.saveData) return (cached = true);

  // Only bail if WebGL is completely unavailable — then the effects can't render.
  try {
    const gl = document.createElement('canvas').getContext('webgl')
      || document.createElement('canvas').getContext('experimental-webgl');
    if (!gl) return (cached = true);
  } catch {
    return (cached = true);
  }

  return (cached = false);
};
