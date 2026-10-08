import React from 'react';
import {
  Sparkles,
  Eye,
  Lock,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  History,
  Settings,
  Trash2,
} from 'lucide-react';
import type { SharedPageConfig } from '../../../types/sharing';

interface ShareManagementCardProps {
  share: SharedPageConfig;
  copiedId: string | null;
  onCopyLink: (id: string) => void;
  onOpenInBrowser: (id: string) => void;
  onInspectLogs: (share: SharedPageConfig) => void;
  onEdit: (share: SharedPageConfig) => void;
  onToggleActive: (share: SharedPageConfig) => void;
  onDelete: (id: string) => void;
}

export const ShareManagementCard: React.FC<ShareManagementCardProps> = ({
  share,
  copiedId,
  onCopyLink,
  onOpenInBrowser,
  onInspectLogs,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left Info */}
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-3xl shrink-0 p-1">{share.icon || '📄'}</span>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
              {share.title || 'Sem Título'}
            </h4>
            {/* Status badge */}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                share.isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'bg-zinc-800 text-zinc-400 border border-white/5'
              }`}
            >
              {share.isActive ? 'Ativo' : 'Pausado'}
            </span>
            {/* Permission badge */}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-white/5 flex items-center gap-1">
              {share.permission === 'editable' ? (
                <>
                  <Sparkles size={10} className="text-emerald-400" />
                  <span>Edição</span>
                </>
              ) : (
                <>
                  <Eye size={10} className="text-zinc-400" />
                  <span>Leitura</span>
                </>
              )}
            </span>
            {/* Password badge */}
            {share.isPasswordProtected && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Lock size={10} />
                <span>Senha</span>
              </span>
            )}
            {/* Approval badge */}
            {share.requireOwnerApproval && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                <ShieldCheck size={10} />
                <span>Guardião</span>
              </span>
            )}
          </div>

          <p className="text-[11px] text-zinc-500 font-mono">
            Criado em: {new Date(share.createdAt).toLocaleDateString()} · ID: {share.id}
          </p>
        </div>
      </div>

      {/* Right Action Toolbar */}
      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
        <button
          onClick={() => onCopyLink(share.id)}
          className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
          title="Copiar Link"
        >
          {copiedId === share.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>

        <button
          onClick={() => onOpenInBrowser(share.id)}
          className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
          title="Abrir Página Compartilhada"
        >
          <ExternalLink size={14} />
        </button>

        <button
          onClick={() => onInspectLogs(share)}
          className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
          title="Histórico e Logs de Acesso"
        >
          <History size={14} />
        </button>

        <button
          onClick={() => onEdit(share)}
          className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
          title="Configurações e Senha"
        >
          <Settings size={14} />
        </button>

        <button
          onClick={() => onToggleActive(share)}
          className="py-1.5 px-3 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
        >
          {share.isActive ? 'Pausar' : 'Reativar'}
        </button>

        <button
          onClick={() => onDelete(share.id)}
          className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
          title="Excluir Definitivamente"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
