import React from 'react';

interface PdfPageBookmarkRibbonProps {
  isBookmarked: boolean;
  onToggleBookmark: () => void;
}

export const PdfPageBookmarkRibbon: React.FC<PdfPageBookmarkRibbonProps> = React.memo(
  ({ isBookmarked, onToggleBookmark }) => {
    return (
      <div
        className={`bookmark-ribbon ${!isBookmarked ? 'bookmark-ribbon-empty' : ''}`}
        onClick={onToggleBookmark}
        title={isBookmarked ? 'Remover marcador' : 'Adicionar marcador'}
      />
    );
  }
);

PdfPageBookmarkRibbon.displayName = 'PdfPageBookmarkRibbon';
