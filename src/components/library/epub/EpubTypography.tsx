import React from 'react';
import { ZoomOut, ZoomIn } from 'lucide-react';
import { useEpub } from './EpubContext';

export default function EpubTypography() {
  const {
    showSettings, readingMode, setReadingMode,
    fontSize, setFontSize, fontFamily, setFontFamily,
    originalFontName, detectedFontSizePx,
    scrollMode, setScrollMode,
    textWidth, setTextWidth
  } = useEpub();

  if (!showSettings) return null;

  return (
    <div className={`absolute top-16 right-4 p-4 rounded-2xl shadow-2xl z-30 border w-64
       ${readingMode === 'dark' ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
         readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
         'bg-white border-gray-200 text-gray-800'}`}>
      
      <div className="mb-4">
        <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tamanho da Fonte</div>
        <div className="flex items-center justify-between bg-black/5 rounded-lg p-1">
          <button onClick={() => setFontSize(f => Math.max(50, f - 10))} className="p-2 hover:bg-black/5 rounded-md flex-1 flex justify-center">
            <ZoomOut size={18} />
          </button>
          <div className="flex flex-col items-center flex-1">
            <span className="text-sm font-medium">{fontSize}%</span>
            {detectedFontSizePx && <span className="text-[10px] opacity-60 leading-none mt-0.5">{detectedFontSizePx}</span>}
          </div>
          <button onClick={() => setFontSize(f => Math.min(250, f + 10))} className="p-2 hover:bg-black/5 rounded-md flex-1 flex justify-center">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Estilo da Fonte</div>
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => setFontFamily('original')} 
            className={`px-3 py-2 rounded-lg text-sm text-left ${fontFamily === 'original' ? 'bg-brand-500 text-white' : 'hover:bg-black/5'}`}
          >
            Original ({originalFontName || 'Detectando...'})
          </button>
          <button onClick={() => setFontFamily('sans')} className={`px-3 py-2 rounded-lg text-sm text-left ${fontFamily === 'sans' ? 'bg-brand-500 text-white' : 'hover:bg-black/5'}`} style={{ fontFamily: 'sans-serif' }}>Sem Serifa (Moderno)</button>
          <button onClick={() => setFontFamily('serif')} className={`px-3 py-2 rounded-lg text-sm text-left ${fontFamily === 'serif' ? 'bg-brand-500 text-white' : 'hover:bg-black/5'}`} style={{ fontFamily: 'serif' }}>Com Serifa (Clássico)</button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold mb-2 opacity-70 uppercase tracking-wider">Tema de Leitura</div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setReadingMode('light')} title="Claro" className={`w-8 h-8 rounded-full bg-white border-2 ${readingMode === 'light' ? 'border-brand-500' : 'border-gray-300'}`} />
          <button onClick={() => setReadingMode('sepia')} title="Sépia" className={`w-8 h-8 rounded-full bg-[#f4ecd8] border-2 ${readingMode === 'sepia' ? 'border-brand-500' : 'border-gray-300'}`} />
          <button onClick={() => setReadingMode('mint')} title="Menta" className={`w-8 h-8 rounded-full bg-[#e8f5e9] border-2 ${readingMode === 'mint' ? 'border-brand-500' : 'border-gray-300'}`} />
          <button onClick={() => setReadingMode('dim')} title="Cinza (Dim)" className={`w-8 h-8 rounded-full bg-[#2d2d30] border-2 ${readingMode === 'dim' ? 'border-brand-500' : 'border-gray-700'}`} />
          <button onClick={() => setReadingMode('nord')} title="Nord" className={`w-8 h-8 rounded-full bg-[#2e3440] border-2 ${readingMode === 'nord' ? 'border-brand-500' : 'border-gray-700'}`} />
          <button onClick={() => setReadingMode('midnight')} title="Meia-noite" className={`w-8 h-8 rounded-full bg-[#0f172a] border-2 ${readingMode === 'midnight' ? 'border-brand-500' : 'border-gray-700'}`} />
          <button onClick={() => setReadingMode('dark')} title="Escuro" className={`w-8 h-8 rounded-full bg-[#1a1a2e] border-2 ${readingMode === 'dark' ? 'border-brand-500' : 'border-gray-700'}`} />
          <button onClick={() => setReadingMode('high-contrast')} title="Alto Contraste" className={`w-8 h-8 rounded-full bg-black border-2 ${readingMode === 'high-contrast' ? 'border-brand-500' : 'border-gray-700'}`} />
        </div>
        <div className="flex items-center justify-between mt-4 mb-2">
          <div className="text-sm font-semibold opacity-80 flex flex-col">
            <span>Largura do Texto</span>
          </div>
          <div className="flex items-center gap-1 bg-black/10 p-0.5 rounded-lg">
            <button 
              onClick={() => setTextWidth('narrow')}
              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'narrow' ? 'bg-brand-500 text-white shadow-sm' : 'hover:bg-black/5 opacity-70'}`}
            >
              Estreita
            </button>
            <button 
              onClick={() => setTextWidth('medium')}
              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'medium' ? 'bg-brand-500 text-white shadow-sm' : 'hover:bg-black/5 opacity-70'}`}
            >
              Média
            </button>
            <button 
              onClick={() => setTextWidth('full')}
              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'full' ? 'bg-brand-500 text-white shadow-sm' : 'hover:bg-black/5 opacity-70'}`}
            >
              Larga
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm font-semibold opacity-80 flex flex-col">
            <span>Leitura Contínua</span>
            <span className="text-[10px] opacity-60 font-normal">Rolar página verticalmente</span>
          </div>
          <button 
            onClick={() => setScrollMode(!scrollMode)}
            className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${scrollMode ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute transition-transform ${scrollMode ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
