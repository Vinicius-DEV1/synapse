import { useState, useRef } from 'react';
import { Image as ImageIcon, X, Upload, Sparkles } from 'lucide-react';
import type { Page } from '../../types';

interface PageCoverProps {
  page: Page;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export function PageCover({ page, onUpdatePage }: PageCoverProps) {
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Max width 1600px for cover to avoid huge base64 strings
        if (width > 1600) {
          height = Math.round((height * 1600) / width);
          width = 1600;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onUpdatePage(page.id, { cover_image: dataUrl });
        setShowCoverModal(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {page.cover_image ? (
        <div className="w-full h-64 relative group border-b border-dark-border">
          <img src={page.cover_image} alt="Capa" className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button 
              onClick={() => setShowCoverModal(true)}
              className="bg-black/50 hover:bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <ImageIcon size={14} /> Trocar Capa
            </button>
            <button 
              onClick={() => onUpdatePage(page.id, { cover_image: null })}
              className="bg-black/50 hover:bg-red-500/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-12 pt-16">
          <div className="mb-2 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity h-8 flex items-end">
            <button 
              onClick={() => setShowCoverModal(true)}
              className="text-dark-subtext hover:text-white flex items-center gap-1.5 text-sm font-medium px-2 py-1 hover:bg-white/5 rounded transition-colors"
            >
              <ImageIcon size={16} /> Adicionar capa
            </button>
          </div>
        </div>
      )}

      {showCoverModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-dark-card border border-dark-border p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowCoverModal(false)} className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-6 text-dark-text">Adicionar Capa</h3>
            
            <div className="space-y-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-4 transition-colors text-white font-medium"
              >
                <Upload size={18} /> Fazer upload do computador
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-dark-subtext text-xs uppercase font-medium">ou</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <div>
                <label className="block text-xs text-dark-subtext mb-2 font-medium">Link da Imagem</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://..."
                    value={coverUrlInput}
                    onChange={e => setCoverUrlInput(e.target.value)}
                    className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button 
                    onClick={() => {
                      if (coverUrlInput.trim()) {
                        onUpdatePage(page.id, { cover_image: coverUrlInput.trim() });
                        setShowCoverModal(false);
                      }
                    }}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => {
                    const randomUrl = `https://picsum.photos/1600/400?random=${Math.random()}`;
                    onUpdatePage(page.id, { cover_image: randomUrl });
                    setShowCoverModal(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors py-2"
                >
                  <Sparkles size={16} /> Gerar Capa Aleatória
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
