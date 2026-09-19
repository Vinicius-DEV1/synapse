/**
 * @file ShareButton.tsx
 * @description Toolbar button placed in the page header allowing one-click access
 * to page sharing configuration and public links.
 */

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Page } from '../../types/notes';
import { ShareModal } from './ShareModal';
import { getNotesKey } from '../../store/useStore';

interface ShareButtonProps {
  page: Page;
  masterKey?: CryptoKey;
}

export const ShareButton: React.FC<ShareButtonProps> = ({ page, masterKey }) => {
  const [isOpen, setIsOpen] = useState(false);
  const effectiveMasterKey = masterKey || getNotesKey();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors cursor-pointer"
        title="Compartilhar Página com Link Seguro..."
      >
        <Share2 size={16} />
        <span className="hidden sm:inline font-medium">Compartilhar</span>
      </button>

      {isOpen && (
        <ShareModal
          page={page}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          masterKey={effectiveMasterKey}
        />
      )}
    </>
  );
};
