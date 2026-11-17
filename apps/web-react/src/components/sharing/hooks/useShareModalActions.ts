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
  exportShareKeyToBase64,
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
  const [shareUrl, setShareUrl] = useState('');
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
    setShareUrl('');

    getShareByPageId(page.id)
      .then(async (share) => {
        if (!isMounted) return;
        setExistingShare(share);
        if (share) {
          let keyBase64: string | undefined;
          const cachedKey = await getWebShareKey(share.id);
          keyBase64 = cachedKey?.shareKeyBase64;
          if (!keyBase64 && masterKey) {
            try {
              const shareKey = await unwrapShareKeyWithMaster(share.wrappedShareKey, masterKey);
              keyBase64 = await exportShareKeyToBase64(shareKey);
            } catch (unwrapError: unknown) {
              console.warn('[ShareModal] Could not restore the direct share key from the owner key.', unwrapError);
            }
          }
          const carriesLinkKey = !share.isPasswordProtected && !share.requireOwnerApproval;
          setShareUrl(buildShareUrl(share.id, carriesLinkKey ? keyBase64 : undefined));
          setScope(share.scope);
          setIncludeMedia(share.includeMedia);
          setIsPasswordProtected(share.isPasswordProtected);
          setRequireOwnerApproval(share.requireOwnerApproval);
          setPermission(share.permission);
        }
      })
      .catch((error: unknown) => {
        console.error('[ShareModal] Could not load existing share configuration.', error);
        if (isMounted) setExistingShare(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, page.id, masterKey]);

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
      setShareUrl(result.shareUrl);
      window.dispatchEvent(new CustomEvent('caderno-share-created'));
      triggerToast('Página compartilhada com sucesso! Link seguro gerado.', 'success');
    } catch (err) {
      console.error('Failed to create share:', err);
      const message = err instanceof Error && err.message.includes('Sign in')
        ? 'Entre na sua conta Firebase para criar um compartilhamento.'
        : 'Erro ao criar link de compartilhamento.';
      triggerToast(message, 'error');
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
          shareKey = await unwrapShareKeyWithMaster(existingShare.wrappedShareKey, effectiveMasterKey);
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
    shareUrl,
    loading,
    isSubmitting,
    copied,
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
