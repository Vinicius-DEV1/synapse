/**
 * @file ShareModal.tsx
 * @description Comprehensive share configuration modal. Allows configuring access permissions,
 * password protection, owner approval gate, media packaging, and instant revocation.
 */

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Lock,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  X,
  Trash2,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { Page } from '../../types/notes';
import type { SharedPageConfig } from '../../types/sharing';
import {
  createShare,
  getShareByPageId,
  revokeShare,
  buildShareUrl,
  updateShareConfig,
  updateShareContent,
} from '../../services/sharing/share-manager';
import { getWebShareKey } from '../../services/db-web';
import {
  importShareKeyFromBase64,
  unwrapShareKeyWithMaster,
} from '../../services/sharing/share-crypto';
import { getNotesKey } from '../../store/useStore';
import { triggerToast } from '../ui/ToastContext';

interface ShareModalProps {
  page: Page;
  isOpen: boolean;
  onClose: () => void;
  masterKey?: CryptoKey;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  page,
  isOpen,
  onClose,
  masterKey,
}) => {
  const [existingShare, setExistingShare] = useState<SharedPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [scope, setScope] = useState<'single' | 'with-children'>('single');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [requireOwnerApproval, setRequireOwnerApproval] = useState(true);
  const [permission, setPermission] = useState<'read-only' | 'editable'>('read-only');

  // Load existing share configuration if present
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    getShareByPageId(page.id)
      .then((share) => {
        if (!isMounted) return;
        setExistingShare(share);
        if (share) {
          setScope(share.scope);
          setIncludeMedia(share.includeMedia);
          setIsPasswordProtected(share.isPasswordProtected);
          setRequireOwnerApproval(share.requireOwnerApproval);
          setPermission(share.permission);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, page.id]);

  if (!isOpen) return null;

  const shareUrl = existingShare ? buildShareUrl(existingShare.id) : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    triggerToast('Link seguro copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateShare = async () => {
    try {
      setIsSubmitting(true);
      const effectiveMasterKey = masterKey || getNotesKey();
      const result = await createShare(
        {
          pageId: page.id,
          scope,
          includeMedia,
          password: isPasswordProtected ? password : null,
          requireOwnerApproval,
          permission,
          expiresAt: null,
          maxViews: null,
        },
        page,
        effectiveMasterKey
      );

      setExistingShare(result.config);
      window.dispatchEvent(new CustomEvent('caderno-share-created'));
      triggerToast('Página compartilhada com sucesso! Link seguro gerado.', 'success');
    } catch (err) {
      console.error('Failed to create share:', err);
      triggerToast('Erro ao criar link de compartilhamento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncContent = async () => {
    if (!existingShare) return;
    try {
      setIsSubmitting(true);
      const effectiveMasterKey = masterKey || getNotesKey();
      let shareKey: CryptoKey | null = null;
      const cached = await getWebShareKey(existingShare.id);
      if (cached?.shareKeyBase64) {
        shareKey = await importShareKeyFromBase64(cached.shareKeyBase64);
      } else if (existingShare.wrappedShareKey) {
        if (effectiveMasterKey) {
          try {
            shareKey = await unwrapShareKeyWithMaster(existingShare.wrappedShareKey, effectiveMasterKey);
          } catch {
            shareKey = await importShareKeyFromBase64(existingShare.wrappedShareKey);
          }
        } else {
          shareKey = await importShareKeyFromBase64(existingShare.wrappedShareKey);
        }
      }

      if (!shareKey) {
        triggerToast('Não foi possível recuperar a chave criptográfica.', 'error');
        return;
      }

      await updateShareContent(existingShare.id, page, shareKey, effectiveMasterKey);
      triggerToast('Conteúdo sincronizado com sucesso no link compartilhado!', 'success');
    } catch (err) {
      console.error('Failed to sync share content:', err);
      triggerToast('Erro ao sincronizar conteúdo da página.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!existingShare) return;
    try {
      setIsSubmitting(true);
      await revokeShare(existingShare.id);
      setExistingShare(null);
      triggerToast('Compartilhamento revogado com sucesso!', 'info');
    } catch (err) {
      console.error('Failed to revoke share:', err);
      triggerToast('Erro ao revogar compartilhamento.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!existingShare) return;
    try {
      const nextActive = !existingShare.isActive;
      await updateShareConfig({
        shareId: existingShare.id,
        isActive: nextActive,
      });
      setExistingShare({ ...existingShare, isActive: nextActive });
      triggerToast(
        nextActive ? 'Compartilhamento reativado!' : 'Compartilhamento pausado.',
        'info'
      );
    } catch {
      triggerToast('Erro ao atualizar status do compartilhamento.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span>Compartilhar Página</span>
                <span className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded-full font-normal">
                  E2EE
                </span>
              </h3>
              <p className="text-xs text-zinc-400 truncate max-w-xs">
                {page.icon || '📄'} {page.title || 'Sem Título'}
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm animate-pulse">
              Carregando configurações de compartilhamento...
            </div>
          ) : existingShare ? (
            /* Active Share View */
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
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Copiar Link"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                    title="Abrir no Navegador"
                  >
                    <ExternalLink size={14} />
                  </a>
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
                    onClick={handleToggleActive}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-850 border border-white/[0.08] transition-colors cursor-pointer"
                  >
                    {existingShare.isActive ? 'Pausar Link' : 'Reativar Link'}
                  </button>

                  <button
                    onClick={handleSyncContent}
                    disabled={isSubmitting}
                    className="py-2 px-3 rounded-xl text-xs font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Atualiza o conteúdo público com as alterações mais recentes da página"
                  >
                    <RefreshCw size={13} className={isSubmitting ? 'animate-spin' : ''} />
                    Sincronizar Conteúdo
                  </button>
                </div>

                <button
                  onClick={handleRevoke}
                  disabled={isSubmitting}
                  className="py-2 px-3 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} />
                  Revogar Definitivamente
                </button>
              </div>
            </div>
          ) : (
            /* Share Creation Form */
            <div className="space-y-4">
              {/* Scope Selection */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2">
                  Escopo do Compartilhamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('single')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scope === 'single'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                        : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <span className="text-xs font-semibold block text-zinc-200">Apenas esta página</span>
                    <span className="text-[11px] text-zinc-500">Compartilha isoladamente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('with-children')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      scope === 'with-children'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                        : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Layers size={13} />
                      <span className="text-xs font-semibold text-zinc-200">Com sub-páginas</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Inclui páginas filhas</span>
                  </button>
                </div>
              </div>

              {/* Permission Tier */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2">
                  Permissão do Visitante
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermission('read-only')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      permission === 'read-only'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                        : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Eye size={13} />
                      <span className="text-xs font-semibold text-zinc-200">Apenas Leitura</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Visitantes só visualizam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPermission('editable')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      permission === 'editable'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                        : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Sparkles size={13} />
                      <span className="text-xs font-semibold text-zinc-200">Edição com Cursores</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">Colaboração ao vivo</span>
                  </button>
                </div>
              </div>

              {/* Security Toggles */}
              <div className="space-y-2 pt-1">
                {/* Media toggle */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/80 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <ImageIcon size={15} className="text-zinc-400" />
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Incluir Mídias e Imagens</span>
                      <span className="text-[11px] text-zinc-500">Empacota imagens criptografadas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMedia}
                    onChange={(e) => setIncludeMedia(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
                  />
                </label>

                {/* Owner approval gate */}
                <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] cursor-pointer hover:bg-zinc-900/80 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck size={15} className="text-emerald-400" />
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">Exigir Minha Autorização</span>
                      <span className="text-[11px] text-zinc-500">
                        O app avisa quando alguém tentar entrar
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireOwnerApproval}
                    onChange={(e) => setRequireOwnerApproval(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
                  />
                </label>

                {/* Password Protection */}
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <Lock size={15} className="text-zinc-400" />
                      <div>
                        <span className="text-xs font-medium text-zinc-200 block">Proteger com Senha</span>
                        <span className="text-[11px] text-zinc-500">Exige senha do visitante</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isPasswordProtected}
                      onChange={(e) => setIsPasswordProtected(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-400 border-zinc-700 bg-zinc-800"
                    />
                  </label>

                  {isPasswordProtected && (
                    <input
                      type="password"
                      placeholder="Digite uma senha forte..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition-colors"
                    />
                  )}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleCreateShare}
                disabled={isSubmitting || (isPasswordProtected && !password.trim())}
                className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Share2 size={15} />
                <span>{isSubmitting ? 'Gerando Link Criptografado...' : 'Gerar Link Seguro'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
