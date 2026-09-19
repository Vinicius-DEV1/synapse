/**
 * @file ShareWaitingApproval.tsx
 * @description Calming waiting screen shown to the visitor while the owner reviews
 * and approves the access request in real-time. Auto-transitions on approval.
 */

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Clock, Sparkles } from 'lucide-react';
import type { VisitorPersona } from '../../types/sharing';

interface ShareWaitingApprovalProps {
  pageTitle: string;
  pageIcon: string;
  persona: VisitorPersona;
  requestedAt: string;
}

export const ShareWaitingApproval: React.FC<ShareWaitingApprovalProps> = ({
  pageTitle,
  pageIcon,
  persona,
  requestedAt,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = new Date(requestedAt).getTime();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [requestedAt]);

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-md bg-zinc-900/60 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6">
        {/* Pulsing Lock / Shield Animation */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-50 duration-1000" />
          <div className="relative w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <ShieldAlert size={28} />
          </div>
        </div>

        {/* Informative text */}
        <div className="space-y-2">
          <div className="text-2xl mb-1">{pageIcon || '📄'}</div>
          <h1 className="text-lg font-bold text-white tracking-tight">{pageTitle}</h1>
          <h2 className="text-base font-semibold text-emerald-400">
            Aguardando autorização do proprietário...
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            O proprietário foi notificado no aplicativo. Assim que ele autorizar, esta página
            irá atualizar automaticamente.
          </p>
        </div>

        {/* Assigned Persona Badge */}
        <div className="p-3 rounded-2xl bg-black/40 border border-white/[0.04] inline-flex items-center gap-2.5 mx-auto">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: persona.color }}
          />
          <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
            <span>Identificado como:</span>
            <strong className="text-white font-mono">{persona.name}</strong>
          </span>
          <Sparkles size={12} className="text-zinc-500" />
        </div>

        {/* Timer / Footer */}
        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono">
          <Clock size={13} />
          <span>Solicitado há {formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>
    </main>
  );
};
