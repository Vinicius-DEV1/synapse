import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'highlight.js/styles/atom-one-dark.css'
import { platform } from './services/platform';

async function init() {
  if (!localStorage.getItem('wiped_for_test_1')) {
    localStorage.clear();
    localStorage.setItem('wiped_for_test_1', '1');
    console.log("🔥 LOCALSTORAGE LIMPO PARA TESTE DE SYNC 🔥");
  }

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
              const result = await val(...args);
              if (typeof prop === 'string' && (prop.startsWith('create') || prop.startsWith('update') || prop.startsWith('delete') || prop.startsWith('set'))) {
                window.dispatchEvent(new Event('app-sync-trigger'));
              }
              return result;
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

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init();
