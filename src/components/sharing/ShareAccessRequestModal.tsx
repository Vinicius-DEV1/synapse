/**
 * @file ShareAccessRequestModal.tsx
 * @description Deep inspection modal allowing the owner to verify visitor
 * hardware metrics, screen geometry, GPU vendor, and timezone before approving access.
 */

import React, { useState } from 'react';
import { ShieldCheck, Monitor, Cpu, Globe, Check, X, Clock, Lock } from 'lucide-react';
import type { ShareAccessRequest } from '../../types/sharing';

interface ShareAccessRequestModalProps {
  request: ShareAccessRequest | null;
  onClose: () => void;
  onApprove: (request: ShareAccessRequest, trustDevice: boolean) => Promise<boolean>;
  onDeny: (requestId: string) => Promise<boolean>;
}

export const ShareAccessRequestModal: React.FC<ShareAccessRequestModalProps> = ({
  request,
  onClose,
  onApprove,
  onDeny,
}) => {
  const [trustDevice, setTrustDevice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request) return null;

  const { deviceFingerprint, passwordVerified, requestedAt, ipHash } = request;
  const signals = deviceFingerprint.signals;

  const handleApprove = async () => {
    setIsSubmitting(true);
    await onApprove(request, trustDevice);
    setIsSubmitting(false);
    onClose();
  };

  const handleDeny = async () => {
    setIsSubmitting(true);
    await onDeny(request.id);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Solicitação de Acesso</h3>
              <p className="text-xs text-zinc-400">
                Um visitante está solicitando permissão para abrir sua página compartilhada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Status banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Lock size={15} className={passwordVerified ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="text-xs font-medium text-zinc-200">
                {passwordVerified ? 'Senha da página verificada' : 'Acesso via link direto'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
              <Clock size={12} />
              <span>{new Date(requestedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Device Signals Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-3">
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Assinatura do Dispositivo
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Monitor size={14} className="text-zinc-500 shrink-0" />
                <span className="truncate">{signals.screenResolution}</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <Cpu size={14} className="text-zinc-500 shrink-0" />
                <span>{signals.hardwareConcurrency} núcleos CPU</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <Globe size={14} className="text-zinc-500 shrink-0" />
                <span className="truncate">{signals.timezone} ({signals.language})</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300 font-mono">
                <span className="text-zinc-500 text-[11px]">IP Hash:</span>
                <span>{ipHash.slice(0, 12)}…</span>
              </div>
            </div>

            {signals.webglRenderer && signals.webglRenderer !== 'none' && (
              <div className="pt-2 border-t border-white/[0.04] text-[11px] text-zinc-400 font-mono truncate">
                GPU: {signals.webglRenderer}
              </div>
            )}
          </div>

          {/* Trust Checkbox */}
          <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/40 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/70 transition-colors">
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-zinc-700 bg-zinc-800"
            />
            <div className="text-xs">
              <span className="font-medium text-zinc-200 block">Lembrar este dispositivo</span>
              <span className="text-zinc-400">
                Não exigir aprovação novamente nas próximas visitas deste aparelho
              </span>
            </div>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-900/60 border-t border-white/[0.06] flex items-center justify-end gap-2.5">
          <button
            onClick={handleDeny}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            Negar Acesso
          </button>

          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={14} />
            Liberar Acesso
          </button>
        </div>
      </div>
    </div>
  );
};
