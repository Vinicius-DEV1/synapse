import { useState, useRef, useEffect, memo } from 'react';
import { Image as ImageIcon, X, Upload, Sparkles, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { triggerToast } from '../ui/ToastContext';
import type { Page } from '../../types';

interface PageCoverProps {
  page: Page;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

function getStableCoverUrl(url?: string | null, pageId?: string): string | undefined {
  if (!url) return undefined;
  if (url.includes('picsum.photos') && !url.includes('/seed/')) {
    try {
      const urlObj = new URL(url);
      const randomParam = urlObj.searchParams.get('random');
      const seed = randomParam ? randomParam.replace('0.', '') : (pageId || 'cover');
      return `https://picsum.photos/seed/${seed}/1600/400`;
    } catch {
      // fallback to original
    }
  }
  return url;
}

function convertImageToCoverDataUrl(img: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas');
  let width = img.width;
  let height = img.height;

  // Max width 1280px at 0.72 quality preserves visual clarity while reducing base64 weight by ~65%
  if (width > 1280) {
    height = Math.round((height * 1280) / width);
    width = 1280;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[PageCover] Não foi possível obter contexto 2D do canvas para redimensionar capa');
    return null;
  }
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.72);
}

export const PageCover = memo(function PageCover({ page, onUpdatePage }: PageCoverProps) {
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showCoverModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCoverModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCoverModal]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      triggerToast('Falha ao ler arquivo de imagem.', 'error');
    };
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        triggerToast('Falha ao processar imagem da capa.', 'error');
      };
      img.onload = () => {
        const dataUrl = convertImageToCoverDataUrl(img);
        if (dataUrl) {
          onUpdatePage(page.id, { cover_image: dataUrl });
          setShowCoverModal(false);
        } else {
          triggerToast('Não foi possível processar a imagem da capa.', 'error');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRandomCover = async () => {
    try {
      setIsGenerating(true);
      const randomSeed = Math.random().toString(36).substring(2, 10);
      const randomUrl = `https://picsum.photos/seed/${randomSeed}/1600/400`;

      // Fetch image as blob to circumvent CORS/canvas taint issues cleanly
      const response = await fetch(randomUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const blob = await response.blob();

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const dataUrl = convertImageToCoverDataUrl(img);
          if (dataUrl) {
            await onUpdatePage(page.id, { cover_image: dataUrl });
          } else {
            await onUpdatePage(page.id, { cover_image: randomUrl });
          }
          setIsGenerating(false);
          setShowCoverModal(false);
        };
        img.onerror = () => {
          triggerToast('Falha ao processar a imagem gerada.', 'error');
          setIsGenerating(false);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        triggerToast('Falha ao ler dados da imagem.', 'error');
        setIsGenerating(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('[PageCover] Failed to generate random cover:', err);
      triggerToast('Falha ao gerar capa aleatória. Verifique sua conexão.', 'error');
      setIsGenerating(false);
    }
  };

  return (
    <>
      {page.cover_image ? (
        <div className="w-full h-64 relative group border-b border-dark-border">
          <img
            src={getStableCoverUrl(page.cover_image, page.id)}
            alt="Capa"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
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
        <Portal>
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCoverModal(false);
          }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4"
        >
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
                  onClick={handleRandomCover}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 text-brand-400 hover:text-brand-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors py-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Baixando e gerando capa...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Gerar Capa Aleatória
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}
    </>
  );
});

