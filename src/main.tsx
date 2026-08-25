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
      console.log("Web / Mobile WebView mode detected. Initializing Unified Web API with IndexedDB...");
      const { createWebApiMock } = await import('./services/web-api');
      mockApi = await createWebApiMock() as any;
    }

    // Signal Mobile Shell (if running inside WebView) that app is mounted and ready
    if (typeof window !== 'undefined') {
      const notifyReady = () => {
        if ((window as any).ReactNativeWebView && (window as any).ReactNativeWebView.postMessage) {
          (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'APP_READY' }));
        }
      };
      setTimeout(notifyReady, 50);
    }
    
    let syncTimeout: any = null;
    const createApiProxy = (obj: any): any => {
      return new Proxy(obj, {
        get(target, prop) {
          const val = target[prop];
          if (typeof val === 'function') {
            // Internal functions (_setMasterKey, _setSyncRunning) and listeners (onSyncTrigger, onLock)
            // must NOT be wrapped in async — they need to return their original value synchronously.
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
                  }, 500); // 500ms debounce
                }
                return result;
              } catch (error: any) {
                console.error(`[API Proxy Error] Failed executing '${String(prop)}':`, error);
                
                // Dispatch global event for ToastProvider to capture
                const errorEvent = new CustomEvent('app-api-error', { 
                  detail: { 
                    message: `Error in operation '${String(prop)}': ${error?.message || 'Unknown error'}`
                  } 
                });
                window.dispatchEvent(errorEvent);
                
                // Re-throw error for original caller to handle (e.g. stop loading state)
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
