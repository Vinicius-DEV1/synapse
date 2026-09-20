/**
 * @file ShareManagementPanel.tsx
 * @description Centralized management view for all shared pages across the notebook.
 * Allows auditing logs, updating passwords, toggling permissions, and instant revocation.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Share2,
  Lock,
  Eye,
  Sparkles,
  ShieldCheck,
  Copy,
  ExternalLink,
  Settings,
  History,
  Trash2,
  Check,
  Search,
  AlertTriangle,
} from 'lucide-react';
import type { SharedPageConfig } from '../../types/sharing';
import {
  listShares,
  revokeShare,
  deleteShare,
  updateShareConfig,
  buildShareUrl,
} from '../../services/sharing/share-manager';
import { triggerToast } from '../ui/ToastContext';
import { ShareAccessLogViewer } from './ShareAccessLogViewer';
import { ShareConfigEditor } from './ShareConfigEditor';

export const ShareManagementPanel: React.FC = () => {
  const [shares, setShares] = useState<SharedPageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states
  const [inspectingLogsShare, setInspectingLogsShare] = useState<SharedPageConfig | null>(null);
  const [editingShare, setEditingShare] = useState<SharedPageConfig | null>(null);

  const loadAllShares = async () => {
    try {
      setLoading(true);
      const data = await listShares();
      setShares(data);
    } catch (err) {
      console.error('Failed to list shares:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllShares();
  }, []);

  const filteredShares = useMemo(() => {
    if (!searchQuery.trim()) return shares;
    const q = searchQuery.toLowerCase();
    return shares.filter((s) => s.title.toLowerCase().includes(q));
  }, [shares, searchQuery]);

  const handleCopyLink = (shareId: string) => {
    const url = buildShareUrl(shareId);
    navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    triggerToast('Link seguro copiado!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenInBrowser = (shareId: string) => {
    const url = buildShareUrl(shareId);
    if (window.api?.os?.openInBrowser) {
      window.api.os.openInBrowser(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleToggleActive = async (share: SharedPageConfig) => {
    try {
      const nextActive = !share.isActive;
      await updateShareConfig({
        shareId: share.id,
        isActive: nextActive,
      });
      setShares((prev) =>
        prev.map((s) => (s.id === share.id ? { ...s, isActive: nextActive } : s))
      );
      triggerToast(nextActive ? 'Link reativado!' : 'Link pausado.', 'info');
    } catch {
      triggerToast('Erro ao atualizar status.', 'error');
    }
  };

  const handleDelete = async (shareId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir definitivamente este link de compartilhamento?')) {
      return;
    }
    try {
      await deleteShare(shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      triggerToast('Compartilhamento excluído com sucesso!', 'info');
    } catch {
      triggerToast('Erro ao excluir compartilhamento.', 'error');
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('Atenção: deseja pausar/revogar TODOS os seus links de compartilhamento ativos?')) {
      return;
    }
    try {
      for (const s of shares) {
        if (s.isActive) {
          await revokeShare(s.id);
        }
      }
      setShares((prev) => prev.map((s) => ({ ...s, isActive: false })));
      triggerToast('Todos os links foram revogados!', 'info');
    } catch {
      triggerToast('Erro ao revogar links.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Share2 size={22} className="text-indigo-400" />
            <span>Páginas Compartilhadas</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Central de controle de todos os links de compartilhamento público e registros de acesso.
          </p>
        </div>

        {shares.length > 0 && (
          <button
            onClick={handleRevokeAll}
            className="py-2 px-3.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <AlertTriangle size={14} />
            <span>Revogar Todos os Links</span>
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder="Filtrar páginas compartilhadas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-white/5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Shares List */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 text-sm animate-pulse">
          Carregando páginas compartilhadas...
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-zinc-900/30 border border-white/[0.04] p-8 space-y-2">
          <Share2 size={32} className="text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-zinc-300">Nenhum compartilhamento ativo</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Para compartilhar uma página, abra qualquer nota do seu caderno e clique no botão
            &quot;Compartilhar&quot; no cabeçalho.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredShares.map((share) => (
            <div
              key={share.id}
              className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
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
                  onClick={() => handleCopyLink(share.id)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
                  title="Copiar Link"
                >
                  {copiedId === share.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>

                <button
                  onClick={() => handleOpenInBrowser(share.id)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
                  title="Abrir Página Compartilhada"
                >
                  <ExternalLink size={14} />
                </button>

                <button
                  onClick={() => setInspectingLogsShare(share)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
                  title="Histórico e Logs de Acesso"
                >
                  <History size={14} />
                </button>

                <button
                  onClick={() => setEditingShare(share)}
                  className="p-2 rounded-xl text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
                  title="Configurações e Senha"
                >
                  <Settings size={14} />
                </button>

                <button
                  onClick={() => handleToggleActive(share)}
                  className="py-1.5 px-3 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 border border-white/5 transition-colors cursor-pointer"
                >
                  {share.isActive ? 'Pausar' : 'Reativar'}
                </button>

                <button
                  onClick={() => handleDelete(share.id)}
                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors cursor-pointer"
                  title="Excluir Definitivamente"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs Modal */}
      {inspectingLogsShare && (
        <ShareAccessLogViewer
          shareId={inspectingLogsShare.id}
          shareTitle={inspectingLogsShare.title}
          onClose={() => setInspectingLogsShare(null)}
        />
      )}

      {/* Config Editor Modal */}
      {editingShare && (
        <ShareConfigEditor
          share={editingShare}
          onClose={() => setEditingShare(null)}
          onUpdated={(updated) => {
            setShares((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          }}
        />
      )}
    </div>
  );
};
