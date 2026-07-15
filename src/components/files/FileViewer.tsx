import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download } from 'lucide-react';
import type { FileItem } from '../../types_files';
import { useStore } from '../../store/useStore';

interface FileViewerProps {
  item: FileItem;
  onClose: () => void;
}

export default function FileViewer({ item, onClose }: FileViewerProps) {
  const { dispatch } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    
    // Load local file content via backend
    if (item.file_type === 'image' || item.file_type === 'pdf') {
      if (item.local_path) {
        window.api.files.getLocal(item.local_path).then(url => {
          if (url && typeof url === 'string') {
            setObjectUrl(url);
          }
        }).catch(console.error);
      } else {
        console.warn("No local path for this file");
      }
    }
    
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  const handleOpenNative = () => {
    // If it's a video, route to video module
    if (item.file_type === 'video') {
      // Logic would be to dispatch to open the video tab, assuming the video module can take a local_path
      alert("Para abrir vídeos, vá para a aba Vídeos e importe o arquivo. Em breve terá integração direta!");
      onClose();
    } else if (item.file_type === 'epub') {
      alert("Para abrir EPUBs, vá para a aba Biblioteca e importe o arquivo. Em breve terá integração direta!");
      onClose();
    }
  };

  const isImage = item.file_type === 'image';
  const isPdf = item.file_type === 'pdf';
  
  if (item.file_type === 'video' || item.file_type === 'epub' || item.file_type === 'slide') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center flex flex-col items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Visualização Externa</h2>
          <p className="text-dark-subtext text-sm mb-2">
            Este tipo de arquivo ({item.file_type}) é melhor visualizado em seu módulo nativo ou aplicativo externo.
          </p>
          <button 
            onClick={handleOpenNative}
            className="w-full px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            Abrir no Módulo Adequado
          </button>
          <button 
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
        <h2 className="text-lg font-semibold text-white truncate max-w-2xl" title={item.name}>
          {item.name}
        </h2>
        <div className="flex items-center gap-2">
          {objectUrl && (
            <a 
              href={objectUrl} 
              download={item.name}
              className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
            >
              <Download size={20} />
            </a>
          )}
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {!objectUrl ? (
          <div className="text-dark-subtext animate-pulse">Carregando arquivo...</div>
        ) : isImage ? (
          <img 
            src={objectUrl} 
            alt={item.name} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        ) : isPdf ? (
          <iframe 
            src={objectUrl} 
            className="w-full h-full rounded-lg bg-white"
            title={item.name}
          />
        ) : (
          <div className="text-dark-subtext">Pré-visualização não disponível.</div>
        )}
      </div>
    </div>
  );
}
