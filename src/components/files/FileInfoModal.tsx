import { useEffect, useState } from 'react';
import { X, File, Calendar, HardDrive, Type, Share2, Tag } from 'lucide-react';
import type { FileItem, FilePageLink } from '../../types';
import { Portal } from '../ui/Portal';

interface FileInfoModalProps {
  item: FileItem;
  onClose: () => void;
}

export default function FileInfoModal({ item, onClose }: FileInfoModalProps) {
  const [links, setLinks] = useState<FilePageLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  
  useEffect(() => {
    let active = true;
    if (window.api?.files?.links) {
      setLinksLoading(true);
      window.api.files.links.getByFile(item.id)
        .then((fetchedLinks) => {
          if (active) {
            setLinks(fetchedLinks || []);
            setLinksLoading(false);
          }
        })
        .catch((err) => {
          console.error("Failed to load file links:", err);
          if (active) setLinksLoading(false);
        });
    } else {
      setLinksLoading(false);
    }
    return () => {
      active = false;
    };
  }, [item.id]);

  const sizeStr = (item.file_size / 1024 / 1024).toFixed(2) + ' MB';
  const createdDate = new Date(item.created_at || Date.now()).toLocaleString();
  const updatedDate = new Date(item.updated_at || Date.now()).toLocaleString();

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-dark-bg/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <File size={20} className="text-brand-400" />
            Detalhes do Arquivo
          </h2>
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center shrink-0">
              <File size={32} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-medium text-lg truncate" title={item.name}>{item.name}</h3>
              <p className="text-dark-subtext uppercase text-sm font-semibold">{item.file_type}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-dark-subtext mb-1">
                <HardDrive size={14} />
                <span className="text-xs font-medium">Tamanho</span>
              </div>
              <p className="text-white text-sm">{sizeStr}</p>
            </div>
            
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-dark-subtext mb-1">
                <Type size={14} />
                <span className="text-xs font-medium">Mime Type</span>
              </div>
              <p className="text-white text-sm truncate" title={item.mime_type || 'N/A'}>{item.mime_type || 'N/A'}</p>
            </div>
            
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-dark-subtext mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">Criado em</span>
              </div>
              <p className="text-white text-sm">{createdDate}</p>
            </div>
            
            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2 text-dark-subtext mb-1">
                <Calendar size={14} />
                <span className="text-xs font-medium">Modificado</span>
              </div>
              <p className="text-white text-sm">{updatedDate}</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
              <Share2 size={16} className="text-blue-400" />
              Vínculos e Origens
            </h4>
            
            <div className="flex flex-wrap gap-2">
              {item.drive_file_id && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium border border-green-500/20">
                  ☁️ Salvo no Drive
                </span>
              )}
              
              {links.map(link => (
                <span key={link.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-medium border border-brand-500/20">
                  <Tag size={12} />
                  Página vinculada
                </span>
              ))}
              
              {!linksLoading && !item.drive_file_id && links.length === 0 && (
                <span className="text-dark-subtext text-sm italic">Nenhum vínculo externo encontrado.</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-white/10 bg-dark-bg/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}
