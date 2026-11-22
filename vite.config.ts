import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Load ONNX Runtime's external-WASM build. The recommendation model sets
  // wasmPaths to a pinned CDN, so bundling the 14.8 MB WASM here is wasted.
  // This condition only selects the package export; inference is unchanged.
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm'],
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
