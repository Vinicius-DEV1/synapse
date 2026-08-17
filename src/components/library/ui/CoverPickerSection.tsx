import React, { useRef, useState, useEffect } from 'react';
import { Palette, ImageIcon,  Upload, FileCode2, Loader2 } from 'lucide-react';
import { extractPdfCover } from '../../../utils/pdf-cover';
import { compressBase64Image } from '../../../utils/image';

interface CoverPickerSectionProps {
  bookId: string;
  hasFilePath: boolean;
  coverImage: string;
  setCoverImage: (cover: string) => void;
  title: string;
  author: string;
}

export function CoverPickerSection({
  bookId,
  hasFilePath,
  coverImage,
  setCoverImage,
  title,
  author
}: CoverPickerSectionProps) {
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [extractingCover, setExtractingCover] = useState(false);
  const coverMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coverMenuRef.current && !coverMenuRef.current.contains(event.target as Node)) {
        setShowCoverMenu(false);
      }
    };
    if (showCoverMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCoverMenu]);

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (JPG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const compressed = await compressBase64Image(base64);
      setCoverImage(compressed);
    };
    reader.readAsDataURL(file);
    setShowCoverMenu(false);
  };

  const handleExtractCover = async () => {
    if (!hasFilePath) return;
    
    setShowCoverMenu(false);
    setExtractingCover(true);
    try {
      if (!window.api?.library?.getBookFile) {
        throw new Error("API de biblioteca não disponível.");
      }
      
      const fileData = await window.api.library.getBookFile(bookId);
      if (!fileData) {
        throw new Error("Arquivo PDF não encontrado localmente.");
      }
      
      let uintArray: Uint8Array;
      if (typeof fileData === 'string') {
        const binaryString = atob(fileData);
        uintArray = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uintArray[i] = binaryString.charCodeAt(i);
        }
      } else if ((fileData as unknown) instanceof ArrayBuffer) {
        uintArray = new Uint8Array(fileData);
      } else {
        uintArray = fileData as Uint8Array;
      }
      
      const base64 = await extractPdfCover(uintArray);
      const compressed = await compressBase64Image(base64);
      setCoverImage(compressed);
    } catch (err) {
      console.error('Falha ao extrair capa', err);
      alert('Erro ao extrair capa do PDF. O arquivo pode estar corrompido, não baixado, ou não suportado.');
    } finally {
      setExtractingCover(false);
    }
  };

  return (
    <div className="flex gap-4 items-start">
      <div className="relative w-24 h-32 rounded-lg bg-dark-bg border border-white/10 flex items-center justify-center overflow-visible shrink-0 group">
        <div className="w-full h-full overflow-hidden rounded-lg flex items-center justify-center">
          {coverImage && !extractingCover ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : extractingCover ? (
            <div className="flex flex-col items-center justify-center gap-1.5 p-2 text-center">
              <Loader2 size={20} className="animate-spin text-brand-400" />
              <span className="text-[10px] text-dark-subtext">Extraindo...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-dark-subtext p-2 text-center">
              <ImageIcon size={24} className="mb-1 opacity-50" />
              <span className="text-[10px] leading-tight">Sem capa</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowCoverMenu(!showCoverMenu)}
          className="absolute -bottom-2 -right-2 p-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95 z-10"
          title="Alterar capa"
        >
          <Palette size={14} />
        </button>

        {showCoverMenu && (
          <div
            ref={coverMenuRef}
            className="absolute left-full top-0 ml-2 w-48 bg-dark-card border border-white/10 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <label className="flex items-center gap-2.5 px-3 py-2 text-xs text-dark-text hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
              <Upload size={14} className="text-dark-subtext" />
              <span>Enviar Imagem</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
              />
            </label>

            {hasFilePath && (
              <button
                type="button"
                onClick={handleExtractCover}
                className="flex items-center gap-2.5 px-3 py-2 text-xs text-dark-text hover:bg-white/5 rounded-lg text-left transition-colors"
              >
                <FileCode2 size={14} className="text-brand-400" />
                <span>Capa do PDF (Pág 1)</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-dark-text truncate">{title || 'Sem título'}</h3>
        <p className="text-xs text-dark-subtext truncate mt-0.5">{author || 'Autor desconhecido'}</p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowCoverMenu(!showCoverMenu)}
            className="text-xs text-brand-400 hover:underline flex items-center gap-1"
          >
            <Palette size={12} /> Alterar Capa
          </button>
        </div>
      </div>
    </div>
  );
}
