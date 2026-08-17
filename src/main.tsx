import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'highlight.js/styles/atom-one-dark.css'
import { platform } from './services/platform';

async function init() {
  if (!window.api) {
    let mockApi;
    if (platform.platform === 'desktop') {
      console.log("Desktop environment detected. Initializing Tauri API Bridge...");
      const { createTauriApi } = await import('./tauri-api');
      mockApi = await createTauriApi() as any;
    } else {
      console.log("Web mode detected. Initializing Web API Mock with IndexedDB...");
      const { createWebApiMock } = await import('./services/web-api');
      mockApi = await createWebApiMock() as any;
    }
    
    let syncTimeout: any = null;
    const createApiProxy = (obj: any): any => {
      return new Proxy(obj, {
        get(target, prop) {
          const val = target[prop];
          if (typeof val === 'function') {
            // Funções internas (_setMasterKey, _setSyncRunning) e listeners (onSyncTrigger, onLock)
            // NÃO devem ser envolvidas em async — precisam retornar o valor original sincronamente.
            if (typeof prop === 'string' && (prop.startsWith('_') || prop.startsWith('on'))) {
              return val;
            }
            return async (...args: any[]) => {
              try {
                const result = await val(...args);
                if (typeof prop === 'string' && (prop.startsWith('create') || prop.startsWith('update') || prop.startsWith('delete') || prop.startsWith('set') || prop.startsWith('upsert'))) {
                  if (syncTimeout) clearTimeout(syncTimeout);
                  syncTimeout = setTimeout(() => {
                    window.dispatchEvent(new Event('app-sync-trigger'));
                  }, 500); // Debounce de 500ms
                }
                return result;
              } catch (error: any) {
                console.error(`[API Proxy Error] Falha ao executar '${String(prop)}':`, error);
                
                // Dispara o evento global para o ToastProvider capturar
                const errorEvent = new CustomEvent('app-api-error', { 
                  detail: { 
                    message: `Erro na operação '${String(prop)}': ${error?.message || 'Falha desconhecida'}`
                  } 
                });
                window.dispatchEvent(errorEvent);
                
                // Repassa o erro para o chamador original lidar (ex: parar estado de loading)
                throw error;
              }
            };
          }
          if (typeof val === 'object' && val !== null) {
            return createApiProxy(val);
          }
          return val;
        }
      });
    };
    
    window.api = createApiProxy(mockApi);
  }

  // Register Service Worker for Web Video Streaming (only on HTTP/HTTPS, not tauri://)
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Força a atualização do Service Worker em cada reload (importante para dev)
      reg.update();
      console.log('Service Worker registered successfully');
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init();
