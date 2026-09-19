/**
 * @file ShareAccessLogViewer.tsx
 * @description Detailed audit log inspector showing access history, visitor IP hashes,
 * timestamps, and security events for a specific shared page.
 */

import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import type { ShareAccessLog } from '../../types/sharing';
import { getAccessLogs } from '../../services/sharing/share-manager';

interface ShareAccessLogViewerProps {
  shareId: string;
  shareTitle: string;
  onClose: () => void;
}

export const ShareAccessLogViewer: React.FC<ShareAccessLogViewerProps> = ({
  shareId,
  shareTitle,
  onClose,
}) => {
  const [logs, setLogs] = useState<ShareAccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getAccessLogs(shareId)
      .then((data) => {
        if (isMounted) setLogs(data);
      })
      .catch((err) => console.error('Failed to load logs:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [shareId]);

  const getActionBadge = (action: ShareAccessLog['action']) => {
    switch (action) {
      case 'view':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Visualização
          </span>
        );
      case 'unlock':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Desbloqueio
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Aprovado
          </span>
        );
      case 'denied':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Recusado
          </span>
        );
      case 'failed-password':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Senha Incorreta
          </span>
        );
      case 'trusted-device-access':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Dispositivo Confiável
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-400">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Histórico de Acessos</h3>
              <p className="text-xs text-zinc-400 truncate max-w-md">{shareTitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Log list */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm animate-pulse">
              Carregando registros de segurança...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">
              Nenhum registro de acesso registrado até o momento.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.04] flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-mono text-[11px] text-zinc-400">
                      IP Hash: {log.ipHash}
                    </span>
                  </div>
                  <p className="text-zinc-300 truncate max-w-md font-mono text-[11px]">
                    {log.userAgent || 'Navegador Web'}
                  </p>
                  {log.metadata?.reason && (
                    <p className="text-[11px] text-zinc-500 italic">
                      Motivo: {log.metadata.reason}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0 text-zinc-500 font-mono text-[11px]">
                  {new Date(log.accessedAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
