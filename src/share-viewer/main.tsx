/**
 * @file main.tsx
 * @description Ultra-lightweight standalone entry point for Caderno's public share viewer.
 * Excludes heavy desktop modules (Tauri IPC, PDF/Epub reader, FFmpeg, Canvas Confetti)
 * keeping bundle size minimal and page load instant.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ShareViewerApp } from './ShareViewerApp';
import '../index.css';

const rootElement = document.getElementById('share-root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ShareViewerApp />
    </StrictMode>
  );
}
