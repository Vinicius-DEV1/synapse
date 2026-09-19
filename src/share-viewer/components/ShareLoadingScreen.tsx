/**
 * @file ShareLoadingScreen.tsx
 * @description Zen minimalist loading screen with shimmer skeleton for 0ms perceived latency.
 */

import React from 'react';

interface ShareLoadingScreenProps {
  title?: string;
  icon?: string;
}

export const ShareLoadingScreen: React.FC<ShareLoadingScreenProps> = ({
  title,
  icon,
}) => {
  return (
    <main
      aria-busy="true"
      aria-label="Carregando página compartilhada"
      className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-400"
    >
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Preview */}
        <div className="flex items-center gap-3">
          <div className="text-4xl animate-pulse">{icon || '📄'}</div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white/80 truncate">
              {title || 'Carregando página compartilhada...'}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Caderno · Conexão Criptografada E2EE</p>
          </div>
        </div>

        {/* Shimmer skeleton lines */}
        <div className="space-y-3 pt-4 border-t border-white/[0.04]">
          <div className="h-4 bg-white/[0.04] rounded-md w-3/4 animate-pulse" />
          <div className="h-4 bg-white/[0.04] rounded-md w-full animate-pulse delay-75" />
          <div className="h-4 bg-white/[0.04] rounded-md w-5/6 animate-pulse delay-150" />
          <div className="h-4 bg-white/[0.04] rounded-md w-2/3 animate-pulse delay-200" />
        </div>
      </div>
    </main>
  );
};
