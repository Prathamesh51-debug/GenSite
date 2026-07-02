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
        // Split the heavy visual libs into their own cached chunks (they're mostly
        // lazy-loaded and not needed on mobile).
        manualChunks: {
          three: ['three', '@react-three/fiber'],
          spline: ['@splinetool/react-spline', '@splinetool/runtime'],
          motion: ['framer-motion', 'motion', 'gsap', 'lenis'],
          particles: ['@tsparticles/engine', '@tsparticles/react', '@tsparticles/slim', 'ogl'],
        },
      },
    },
  },
})
