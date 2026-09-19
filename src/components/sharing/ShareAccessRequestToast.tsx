/**
 * @file ShareAccessRequestToast.tsx
 * @description Floating toast notification alerting the owner when a visitor
 * requests permission to view an approved or password-verified shared page.
 */

import React from 'react';
import { ShieldCheck, Check, X, ExternalLink } from 'lucide-react';
import type { ShareAccessRequest } from '../../types/sharing';

interface ShareAccessRequestToastProps {
  requests: ShareAccessRequest[];
  onApprove: (request: ShareAccessRequest) => Promise<boolean>;
  onDeny: (requestId: string) => Promise<boolean>;
  onInspect: (request: ShareAccessRequest) => void;
}

export const ShareAccessRequestToast: React.FC<ShareAccessRequestToastProps> = ({
  requests,
  onApprove,
  onDeny,
  onInspect,
}) => {
  if (requests.length === 0) return null;

  // Show the most recent request on top
  const activeReq = requests[requests.length - 1];
  const { deviceFingerprint, passwordVerified } = activeReq;

  return (
    <aside
      role="region"
      aria-label="Notificações de Acesso Compartilhado"
      className="fixed bottom-6 right-6 z-[120] max-w-sm w-full bg-zinc-900/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
          <ShieldCheck size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Solicitação de Acesso
            </h4>
            {requests.length > 1 && (
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-zinc-300 font-mono">
                +{requests.length - 1} pendentes
              </span>
            )}
          </div>

          <p className="text-sm font-medium text-white truncate mt-0.5">
            {deviceFingerprint.displayLabel || 'Dispositivo Desconhecido'}
          </p>

          <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
            {passwordVerified ? (
              <span className="text-emerald-400 font-medium">✓ Senha correta</span>
            ) : (
              <span>Link direto</span>
            )}
            <span>·</span>
            <span className="font-mono text-[11px] text-zinc-500">
              IP {activeReq.ipHash.slice(0, 8)}…
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
        <button
          onClick={() => onInspect(activeReq)}
          className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-1 cursor-pointer"
        >
          <ExternalLink size={13} />
          Detalhes
        </button>

        <button
          onClick={() => onDeny(activeReq.id)}
          className="py-1.5 px-3 rounded-lg text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <X size={13} />
          Negar
        </button>

        <button
          onClick={() => onApprove(activeReq)}
          className="py-1.5 px-3.5 rounded-lg text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
        >
          <Check size={14} />
          Liberar
        </button>
      </div>
    </aside>
  );
};
