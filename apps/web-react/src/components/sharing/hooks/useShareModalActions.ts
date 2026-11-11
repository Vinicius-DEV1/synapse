import { useState, useEffect } from 'react';
import type { Page } from '../../../types/notes';
import type { SharedPageConfig } from '../../../types/sharing';
import {
  createShare,
  getShareByPageId,
  revokeShare,
  buildShareUrl,
  updateShareConfig,
  updateShareContent,
} from '../../../services/sharing/share-manager';
import { getWebShareKey } from '../../../services/db-web';
import {
  importShareKeyFromBase64,
  unwrapShareKeyWithMaster,
} from '../../../services/sharing/share-crypto';
import { getNotesKey } from '../../../store/useStore';
import { triggerToast } from '../../ui/ToastContext';

interface UseShareModalActionsParams {
  page: Page;
  isOpen: boolean;
  masterKey?: CryptoKey;
}

export function useShareModalActions({
  page,
  isOpen,
  masterKey,
}: UseShareModalActionsParams) {
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

  const shareUrl = existingShare ? buildShareUrl(existingShare.id) : '';

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    triggerToast('Link seguro copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInBrowser = () => {
    if (!shareUrl) return;
    if (window.api?.os?.openInBrowser) {
      window.api.os.openInBrowser(shareUrl);
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
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

  return {
    existingShare,
    loading,
    isSubmitting,
    copied,
    shareUrl,
    scope,
    setScope,
    includeMedia,
    setIncludeMedia,
    isPasswordProtected,
    setIsPasswordProtected,
    password,
    setPassword,
    requireOwnerApproval,
    setRequireOwnerApproval,
    permission,
    setPermission,
    handleCopyLink,
    handleOpenInBrowser,
    handleCreateShare,
    handleSyncContent,
    handleRevoke,
    handleToggleActive,
  };
}
