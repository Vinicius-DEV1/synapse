import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.TAURI_ENV_PLATFORM ? './' : '/',
  server: {
    port: 35174,
    host: '127.0.0.1',
    watch: {
      ignored: ['**/src-tauri/target/**', '**/dist/**', '**/dist-web/**']
    }
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tiptap')) {
              return 'tiptap';
            }
            if (id.includes('epubjs')) {
              return 'epub';
            }
            if (id.includes('yjs') || id.includes('y-prosemirror')) {
              return 'yjs';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('firebase')) {
              return 'firebase';
            }
          }
        }
      }
    }
  }
})
