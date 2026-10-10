import React, { useState, useEffect, useMemo } from 'react';
import { Share2, Search, AlertTriangle } from 'lucide-react';
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
import { ShareManagementCard } from './components/ShareManagementCard';

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
    const msg = 'Tem certeza de que deseja excluir definitivamente este link de compartilhamento?';
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Excluir Link Compartilhado',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) {
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
    const msg = 'Atenção: deseja pausar/revogar TODOS os seus links de compartilhamento ativos?';
    const confirmed = window.api?.app?.showConfirm
      ? (await window.api.app.showConfirm({
          title: 'Revogar Todos os Links',
          message: msg,
          kind: 'warning',
        })) === 1
      : typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(msg);
    if (!confirmed) {
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
            <ShareManagementCard
              key={share.id}
              share={share}
              copiedId={copiedId}
              onCopyLink={handleCopyLink}
              onOpenInBrowser={handleOpenInBrowser}
              onInspectLogs={(s) => setInspectingLogsShare(s)}
              onEdit={(s) => setEditingShare(s)}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
            />
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
