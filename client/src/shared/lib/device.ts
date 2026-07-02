// Best-effort "can this device comfortably run heavy WebGL" probe.
//
// The hero stacks a multi-MB Spline 3D scene, an Aurora shader, a particle field
// and a fluid-cursor simulation — several live WebGL contexts at once. On cheap
// laptops without a dedicated GPU (software rendering, low memory, few cores) that
// lags hard. When this returns true we drop to the lightweight gradient fallbacks.
//
// Result is cached — the checks are cheap but the WebGL probe allocates a context.
let cached: boolean | null = null;

export const isLowPowerDevice = (): boolean => {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return (cached = false);
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  // Explicit user/OS signals win outright.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return (cached = true);
  if (nav.connection?.saveData) return (cached = true);

  // Low RAM / few logical cores are strong low-end signals (Chromium exposes these).
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return (cached = true);
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4) return (cached = true);

  // Software / fallback GPU renderer → no real hardware acceleration.
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return (cached = true);
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|software|llvmpipe|microsoft basic render|paravirtual/i.test(renderer)) {
      return (cached = true);
    }
  } catch {
    return (cached = true);
  }

  return (cached = false);
};
