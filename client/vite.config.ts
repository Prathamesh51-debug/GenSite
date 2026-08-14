import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the animation runtime in its own long-lived cache chunk. The old
        // `particles` chunk (tsparticles + ogl) is gone with the WebGL hero, and
        // `motion`/`gsap` went with it — framer-motion is the only animation
        // library left, and lenis rides along since it loads on every route.
        manualChunks: {
          motion: ['framer-motion', 'lenis'],
        },
      },
    },
  },
})
