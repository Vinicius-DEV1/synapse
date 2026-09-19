/**
 * @file ShareAccessDenied.tsx
 * @description Informs the visitor that the owner declined the access request.
 */

import React from 'react';
import { ShieldX, RotateCcw } from 'lucide-react';

interface ShareAccessDeniedProps {
  onRetry: () => void;
}

export const ShareAccessDenied: React.FC<ShareAccessDeniedProps> = ({ onRetry }) => {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/60 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldX size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-white tracking-tight">Acesso Recusado</h1>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            O proprietário desta página optou por não autorizar o acesso para este dispositivo no momento.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onRetry}
            className="py-2.5 px-5 rounded-xl text-xs font-semibold text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    </main>
  );
};
