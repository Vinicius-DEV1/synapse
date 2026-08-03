import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download, FileText, File } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { FileItem } from '../../types';
import { useStore } from '../../store/useStore';
import { getDecryptedFileUrl } from '../../utils/file-fetcher';

interface FileViewerProps {
  item: FileItem;
  onClose: () => void;
}

function FileViewerContent({ item, onClose }: FileViewerProps) {
  const { state } = useStore();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    let url: string | null = null;
    
    // Load local file content via backend or drive
    if (['image', 'pdf', 'text', 'other'].includes(item.file_type)) {
      getDecryptedFileUrl(item, state.moduleKeys['files']).then(async url => {
        if (url && typeof url === 'string') {
          setObjectUrl(url);
          if (item.file_type === 'text') {
            try {
              const res = await fetch(url);
              const txt = await res.text();
              setTextContent(txt);
            } catch(e) {
              console.error("Failed to fetch text", e);
              setTextContent("Erro ao carregar texto.");
            }
          }
        } else {
          console.warn("Nenhum arquivo local ou no Drive disponível");
        }
      }).catch(console.error);
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
  const isText = item.file_type === 'text';
  
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

  // Para PDFs, layout full-screen sem barra extra (o iframe já tem toolbar própria)
  if (isPdf) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        {/* Barra compacta flutuante sobre o PDF */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-dark-bg/80 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 shadow-lg">
          <span className="text-xs text-dark-subtext font-medium truncate max-w-48 px-1" title={item.name}>
            {item.name}
          </span>
          {objectUrl && (
            <a 
              href={objectUrl} 
              download={item.name}
              className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Download"
            >
              <Download size={16} />
            </a>
          )}
          <button 
            onClick={onClose} 
            className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {!objectUrl ? (
          <div className="flex-1 flex items-center justify-center text-dark-subtext animate-pulse">Carregando PDF...</div>
        ) : (
          <iframe 
            src={objectUrl} 
            className="w-full h-full bg-white"
            title={item.name}
          />
        )}
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
        ) : isText ? (
          <div className="w-full h-full max-w-4xl bg-dark-card border border-white/10 rounded-xl shadow-2xl p-6 overflow-auto">
            {textContent ? (
              <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">{textContent}</pre>
            ) : (
              <div className="text-dark-subtext animate-pulse">Lendo texto...</div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-dark-card border border-white/10 rounded-2xl max-w-md w-full shadow-2xl gap-4">
            <div className="p-4 bg-brand-500/20 text-brand-400 rounded-2xl mb-2">
              <File size={48} />
            </div>
            <h3 className="text-xl font-semibold text-white text-center break-all">{item.name}</h3>
            <p className="text-dark-subtext text-center mb-4 text-sm">
              Visualização não suportada para este formato. <br/> 
              Tamanho: {(item.file_size / 1024 / 1024).toFixed(2)} MB
            </p>
            <a 
              href={objectUrl} 
              download={item.name}
              className="w-full px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Baixar Arquivo
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileViewer(props: FileViewerProps) {
  return (
    <Portal>
      <FileViewerContent {...props} />
    </Portal>
  );
}
