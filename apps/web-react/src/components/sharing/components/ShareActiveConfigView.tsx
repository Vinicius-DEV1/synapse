import React from 'react';
import { Copy, Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import type { SharedPageConfig } from '../../../types/sharing';

interface ShareActiveConfigViewProps {
  existingShare: SharedPageConfig;
  shareUrl: string;
  copied: boolean;
  isSubmitting: boolean;
  onCopyLink: () => void;
  onOpenInBrowser: () => void;
  onToggleActive: () => void;
  onSyncContent: () => void;
  onRevoke: () => void;
}

export const ShareActiveConfigView: React.FC<ShareActiveConfigViewProps> = ({
  existingShare,
  shareUrl,
  copied,
  isSubmitting,
  onCopyLink,
  onOpenInBrowser,
  onToggleActive,
  onSyncContent,
  onRevoke,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-zinc-900 border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Link de Acesso Público
          </span>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              existingShare.isActive
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'bg-zinc-800 text-zinc-400 border border-white/5'
            }`}
          >
            {existingShare.isActive ? 'Ativo' : 'Pausado'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg p-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs text-zinc-300 font-mono outline-none truncate"
          />
          <button
            onClick={onCopyLink}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Copiar Link"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>
          <button
            onClick={onOpenInBrowser}
            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Abrir no Navegador"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Status Details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
          <span className="text-zinc-500 block">Permissão</span>
          <span className="text-zinc-200 font-medium capitalize">
            {existingShare.permission === 'editable' ? 'Edição Colaborativa' : 'Apenas Leitura'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04]">
          <span className="text-zinc-500 block">Guardião</span>
          <span className="text-zinc-200 font-medium">
            {existingShare.requireOwnerApproval ? 'Aprovação Ativa' : 'Acesso Direto'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            disabled={isSubmitting}
            className="py-2 px-3 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-white/[0.08] transition-colors cursor-pointer"
          >
            {existingShare.isActive ? 'Pausar Link' : 'Reativar Link'}
          </button>

          <button
            onClick={onSyncContent}
            disabled={isSubmitting}
            className="py-2 px-3 rounded-xl text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Atualiza o conteúdo público com as alterações mais recentes da página"
          >
            <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
            Sincronizar Conteúdo
          </button>
        </div>

        <button
          onClick={onRevoke}
          disabled={isSubmitting}
          className="py-2 px-3 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 size={13} />
          Revogar Definitivamente
        </button>
      </div>
    </div>
  );
};
