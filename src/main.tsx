import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'highlight.js/styles/atom-one-dark.css'
import { platform } from './services/platform';

async function init() {
  if (!window.api) {
    let mockApi: Record<string, unknown>;
    if (platform.platform === 'desktop') {
      console.log("Desktop environment detected. Initializing Tauri API Bridge...");
      const { createTauriApi } = await import('./tauri-api');
      mockApi = await createTauriApi() as unknown as Record<string, unknown>;
    } else {
      console.log("Web / Mobile WebView mode detected. Initializing Unified Web API with IndexedDB...");
      const { createWebApiMock } = await import('./services/web-api');
      mockApi = await createWebApiMock() as unknown as Record<string, unknown>;
    }

    // Signal Mobile Shell (if running inside WebView) that app is mounted and ready
    if (typeof window !== 'undefined') {
      const notifyReady = () => {
        const globalWindow = window as typeof window & { ReactNativeWebView?: { postMessage: (msg: string) => void } };
        if (globalWindow.ReactNativeWebView && globalWindow.ReactNativeWebView.postMessage) {
          globalWindow.ReactNativeWebView.postMessage(JSON.stringify({ type: 'APP_READY' }));
        }
      };
      setTimeout(notifyReady, 50);
    }
    
    let syncTimeout: ReturnType<typeof setTimeout> | null = null;
    const createApiProxy = <T extends Record<string, unknown>>(obj: T): T => {
      return new Proxy(obj, {
        get(target, prop) {
          if (typeof prop !== 'string') {
            return Reflect.get(target, prop);
          }
          const val = target[prop];
          if (typeof val === 'function') {
            // Internal functions (_setMasterKey, _setSyncRunning) and listeners (onSyncTrigger, onLock)
            // must NOT be wrapped in async — they need to return their original value synchronously.
            if (prop.startsWith('_') || prop.startsWith('on')) {
              return val;
            }
            return async (...args: unknown[]) => {
              try {
                const result = await val(...args);
                if (typeof prop === 'string' && (prop.startsWith('create') || prop.startsWith('update') || prop.startsWith('delete') || prop.startsWith('set') || prop.startsWith('upsert'))) {
                  if (syncTimeout) clearTimeout(syncTimeout);
                  syncTimeout = setTimeout(() => {
                    window.dispatchEvent(new Event('app-sync-trigger'));
                  }, 500); // 500ms debounce
                }
                return result;
              } catch (error: unknown) {
                console.error(`[API Proxy Error] Failed executing '${String(prop)}':`, error);
                
                const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Unknown error');
                
                // Only dispatch global toast for mutation operations; queries/fetches handle errors in their local UI
                const isQueryOperation = typeof prop === 'string' && (prop.startsWith('fetch') || prop.startsWith('get') || prop.startsWith('search'));
                if (!isQueryOperation) {
                  const errorEvent = new CustomEvent('app-api-error', { 
                    detail: { 
                      message: `Error in operation '${String(prop)}': ${errorMessage}`
                    } 
                  });
                  window.dispatchEvent(errorEvent);
                }
                
                // Re-throw error for original caller to handle (e.g. stop loading state)
                throw error;
              }
            };
          }
          if (typeof val === 'object' && val !== null) {
            return createApiProxy(val as Record<string, unknown>);
          }
          return val;
        }
      }) as T;
    };
    
    window.api = createApiProxy(mockApi) as typeof window.api;
  }

  // Register Service Worker for Web Video Streaming (only on HTTP/HTTPS, not tauri://)
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // Force Service Worker update on each reload (important for dev)
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
