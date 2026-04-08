import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react')) return 'react-vendor'
          if (id.includes('lucide-react')) return 'icon-vendor'
          if (id.includes('firebase/app')) return 'firebase-app'
          if (id.includes('firebase/auth')) return 'firebase-auth'
          if (id.includes('firebase/firestore')) return 'firebase-firestore'
          if (id.includes('firebase/storage')) return 'firebase-storage'
          return 'vendor'
        },
      },
    },
  },
})
