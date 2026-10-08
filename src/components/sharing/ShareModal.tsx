import React from 'react';
import { Share2, X } from 'lucide-react';
import type { Page } from '../../types/notes';
import { useShareModalActions } from './hooks/useShareModalActions';
import { ShareActiveConfigView } from './components/ShareActiveConfigView';
import { ShareCreationForm } from './components/ShareCreationForm';

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
  const {
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
  } = useShareModalActions({
    page,
    isOpen,
    masterKey,
  });

  if (!isOpen) return null;

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
            <ShareActiveConfigView
              existingShare={existingShare}
              shareUrl={shareUrl}
              copied={copied}
              isSubmitting={isSubmitting}
              onCopyLink={handleCopyLink}
              onOpenInBrowser={handleOpenInBrowser}
              onToggleActive={handleToggleActive}
              onSyncContent={handleSyncContent}
              onRevoke={handleRevoke}
            />
          ) : (
            <ShareCreationForm
              scope={scope}
              setScope={setScope}
              permission={permission}
              setPermission={setPermission}
              includeMedia={includeMedia}
              setIncludeMedia={setIncludeMedia}
              requireOwnerApproval={requireOwnerApproval}
              setRequireOwnerApproval={setRequireOwnerApproval}
              isPasswordProtected={isPasswordProtected}
              setIsPasswordProtected={setIsPasswordProtected}
              password={password}
              setPassword={setPassword}
              isSubmitting={isSubmitting}
              onSubmit={handleCreateShare}
            />
          )}
        </div>
      </div>
    </div>
  );
};
