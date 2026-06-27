import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { createWebApiMock } from './services/web-api'

async function init() {
  if (!window.api) {
    console.log("Web mode detected. Initializing Web API Mock with IndexedDB...");
    window.api = await createWebApiMock() as any;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

init();
