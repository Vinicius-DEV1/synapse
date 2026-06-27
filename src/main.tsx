import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createWebApiMock } from './services/web-api'

async function init() {
  if (!window.api) {
    console.log("Web mode detected. Initializing Web API Mock with IndexedDB...");
    const mockApi = await createWebApiMock() as any;
    
    const createApiProxy = (obj: any): any => {
      return new Proxy(obj, {
        get(target, prop) {
          const val = target[prop];
          if (typeof val === 'function') {
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
