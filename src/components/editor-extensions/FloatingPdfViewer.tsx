import { useEffect, useState, useRef } from 'react';
import { X, Maximize2, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';
import type { FileItem } from '../../types';

interface FloatingPdfViewerProps {
  item: FileItem;
  onClose: () => void;
  onExpand: () => void;
}

function FloatingPdfViewerContent({ item, onClose, onExpand }: FloatingPdfViewerProps) {
  const { state } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const filesMasterKey = state.moduleKeys['files'];
  const itemId = item.id;
  const itemUpdatedAt = item.updated_at;
  const itemLocalPath = item.local_path;
  const itemDriveId = item.drive_file_id;
  const fileKey = `${itemId}_${itemUpdatedAt || ''}_${itemLocalPath || ''}_${itemDriveId || ''}`;
  const currentKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentKeyRef.current === fileKey && objectUrl) {
      return;
    }

    if (item.file_type === 'pdf') {
      getDecryptedFileUrl(item, filesMasterKey)
        .then(url => {
          if (typeof url === 'string') {
            setObjectUrl(url);
            currentKeyRef.current = fileKey;
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
      setError(true);
    }
    
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileKey, filesMasterKey, item, objectUrl]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose} contentEditable={false}>
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl w-[90vw] max-w-2xl h-[70vh] flex flex-col shadow-2xl overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-dark-bg/80 border-b border-white/5">
          <div className="flex flex-col overflow-hidden pr-4">
            <span className="text-white/90 text-sm font-medium truncate">{item.name}</span>
            <span className="text-white/40 text-[10px] uppercase tracking-wider mt-0.5">Pré-visualização de PDF</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onExpand}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-brand-500/20 text-white/60 hover:text-brand-400 transition-colors"
              title="Visualizador Completo"
            >
              <Maximize2 size={16} />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#2a2a2a] relative overflow-hidden flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <Loader2 size={24} className="animate-spin text-brand-500" />
              <span className="text-sm">Descriptografando PDF...</span>
            </div>
          ) : error || !objectUrl ? (
            <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
              <span className="text-sm">Não foi possível carregar a pré-visualização.</span>
              <button onClick={onExpand} className="text-brand-400 text-sm hover:underline">
                Abrir visualizador completo
              </button>
            </div>
          ) : (
            <iframe 
              src={`${objectUrl}#toolbar=0&navpanes=0&scrollbar=1`} 
              className="w-full h-full border-none bg-white"
              title={item.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FloatingPdfViewer(props: FloatingPdfViewerProps) {
  return (
    <Portal>
      <FloatingPdfViewerContent {...props} />
    </Portal>
  );
}
