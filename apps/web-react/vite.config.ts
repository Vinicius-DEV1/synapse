import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

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
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : process.env.TAURI_ENV_PLATFORM ? 'safari13' : 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        'share-viewer': resolve(import.meta.dirname, 'share-viewer.html'),
      },
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'lucide';
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
            if (id.includes('@xenova/transformers') || id.includes('onnxruntime-web')) {
              return 'transformers';
            }
          }
        }
      }
    }
  }
})
