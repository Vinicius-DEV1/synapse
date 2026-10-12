import { ZoomOut, ZoomIn, AlignJustify, AlignLeft } from 'lucide-react';
import { useEpub } from './EpubContext';

export default function EpubTypography() {
  const {
    showSettings, readingMode, setReadingMode,
    fontSize, setFontSize, fontFamily, setFontFamily,
    originalFontName, detectedFontSizePx,
    scrollMode, setScrollMode,
    textWidth, setTextWidth,
    lineHeight, setLineHeight,
    textAlign, setTextAlign,
    paragraphSpacing, setParagraphSpacing
  } = useEpub();

  if (!showSettings) return null;

  const isDark = ['dark', 'midnight', 'nord', 'dim', 'high-contrast'].includes(readingMode);
  const containerTheme = isDark
    ? 'bg-[#18181b] border-white/10 text-zinc-200 shadow-2xl shadow-black/60'
    : readingMode === 'sepia'
    ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636] shadow-2xl shadow-amber-950/20'
    : readingMode === 'mint'
    ? 'bg-[#e8f5e9] border-[#c8e6c9] text-[#1b4332] shadow-2xl shadow-emerald-950/20'
    : 'bg-white border-zinc-200 text-zinc-800 shadow-2xl shadow-zinc-400/20';

  const trackBg = isDark ? 'bg-white/5' : 'bg-black/5';
  const activeBtnClass = 'bg-brand-500 text-white shadow-sm';
  const inactiveBtnClass = isDark
    ? 'hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
    : 'hover:bg-black/5 text-zinc-600 hover:text-zinc-900';

  return (
    <div className={`absolute top-16 right-4 p-4 rounded-2xl z-30 border w-72 sm:w-80 max-h-[calc(100vh-5rem)] overflow-y-auto select-none backdrop-blur-sm ${containerTheme}`}>
      
      {/* 1. Tamanho da Fonte */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Tamanho da Fonte</div>
        <div className={`flex items-center justify-between ${trackBg} rounded-xl p-1`}>
          <button 
            onClick={() => setFontSize(f => Math.max(50, f - 10))} 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg flex-1 flex justify-center transition-colors"
            title="Diminuir fonte"
          >
            <ZoomOut size={16} />
          </button>
          <div className="flex flex-col items-center flex-1">
            <span className="text-sm font-semibold">{fontSize}%</span>
            {detectedFontSizePx && <span className="text-[10px] opacity-60 leading-none mt-0.5">{detectedFontSizePx}</span>}
          </div>
          <button 
            onClick={() => setFontSize(f => Math.min(250, f + 10))} 
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg flex-1 flex justify-center transition-colors"
            title="Aumentar fonte"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>
      
      {/* 2. Estilo da Fonte */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Estilo da Fonte</div>
        <div className="grid grid-cols-1 gap-1">
          <button 
            onClick={() => setFontFamily('original')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${fontFamily === 'original' ? activeBtnClass : inactiveBtnClass}`}
          >
            Original ({originalFontName || 'Detectando...'})
          </button>
          <button 
            onClick={() => setFontFamily('sans')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${fontFamily === 'sans' ? activeBtnClass : inactiveBtnClass}`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Sem Serifa (Moderno)
          </button>
          <button 
            onClick={() => setFontFamily('serif')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${fontFamily === 'serif' ? activeBtnClass : inactiveBtnClass}`}
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Com Serifa (Clássico)
          </button>
          <button 
            onClick={() => setFontFamily('opendyslexic')} 
            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${fontFamily === 'opendyslexic' ? activeBtnClass : inactiveBtnClass}`}
            style={{ fontFamily: 'OpenDyslexic, sans-serif' }}
          >
            OpenDyslexic (Acessível)
          </button>
        </div>
      </div>

      {/* 3. Alinhamento do Texto */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Alinhamento</div>
        <div className={`grid grid-cols-2 gap-1 ${trackBg} p-1 rounded-xl`}>
          <button 
            onClick={() => setTextAlign('justify')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${textAlign === 'justify' ? activeBtnClass : inactiveBtnClass}`}
            title="Justificado (Livro impresso)"
          >
            <AlignJustify size={14} />
            <span>Justificado</span>
          </button>
          <button 
            onClick={() => setTextAlign('left')}
            className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${textAlign === 'left' ? activeBtnClass : inactiveBtnClass}`}
            title="Alinhado à esquerda"
          >
            <AlignLeft size={14} />
            <span>À Esquerda</span>
          </button>
        </div>
      </div>

      {/* 4. Espaçamento entre Linhas (Entrelinha) */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Espaçamento de Linha</div>
        <div className={`grid grid-cols-3 gap-1 ${trackBg} p-1 rounded-xl`}>
          <button 
            onClick={() => setLineHeight('compact')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors text-center ${lineHeight === 'compact' ? activeBtnClass : inactiveBtnClass}`}
            title="Entrelinha compacta (1.4x)"
          >
            Compacto
          </button>
          <button 
            onClick={() => setLineHeight('normal')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors text-center ${lineHeight === 'normal' ? activeBtnClass : inactiveBtnClass}`}
            title="Entrelinha padrão editorial (1.65x)"
          >
            Normal
          </button>
          <button 
            onClick={() => setLineHeight('relaxed')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors text-center ${lineHeight === 'relaxed' ? activeBtnClass : inactiveBtnClass}`}
            title="Entrelinha ampla respirável (1.9x)"
          >
            Amplo
          </button>
        </div>
      </div>

      {/* 5. Estilo dos Parágrafos */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Parágrafos</div>
        <div className={`grid grid-cols-2 gap-1 ${trackBg} p-1 rounded-xl`}>
          <button 
            onClick={() => setParagraphSpacing('compact')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors text-center ${paragraphSpacing === 'compact' ? activeBtnClass : inactiveBtnClass}`}
            title="Clássico: recuo na primeira linha e espaçamento denso"
          >
            Com Recuo
          </button>
          <button 
            onClick={() => setParagraphSpacing('spaced')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-colors text-center ${paragraphSpacing === 'spaced' ? activeBtnClass : inactiveBtnClass}`}
            title="Moderno: sem recuo e linha em branco entre parágrafos"
          >
            Espaçados
          </button>
        </div>
      </div>

      {/* 6. Tema de Leitura */}
      <div className="mb-4">
        <div className="text-[11px] font-semibold mb-1.5 opacity-70 uppercase tracking-wider">Tema de Leitura</div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setReadingMode('light')} title="Claro" className={`w-7 h-7 rounded-full bg-white border-2 transition-transform ${readingMode === 'light' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-300 dark:border-zinc-700'}`} />
          <button onClick={() => setReadingMode('sepia')} title="Sépia" className={`w-7 h-7 rounded-full bg-[#f4ecd8] border-2 transition-transform ${readingMode === 'sepia' ? 'border-brand-500 scale-110 shadow-sm' : 'border-[#d4c6a0]'}`} />
          <button onClick={() => setReadingMode('mint')} title="Menta" className={`w-7 h-7 rounded-full bg-[#e8f5e9] border-2 transition-transform ${readingMode === 'mint' ? 'border-brand-500 scale-110 shadow-sm' : 'border-[#c8e6c9]'}`} />
          <button onClick={() => setReadingMode('dim')} title="Cinza (Dim)" className={`w-7 h-7 rounded-full bg-[#2d2d30] border-2 transition-transform ${readingMode === 'dim' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-700'}`} />
          <button onClick={() => setReadingMode('nord')} title="Nord" className={`w-7 h-7 rounded-full bg-[#2e3440] border-2 transition-transform ${readingMode === 'nord' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-700'}`} />
          <button onClick={() => setReadingMode('midnight')} title="Meia-noite" className={`w-7 h-7 rounded-full bg-[#0f172a] border-2 transition-transform ${readingMode === 'midnight' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-700'}`} />
          <button onClick={() => setReadingMode('dark')} title="Escuro" className={`w-7 h-7 rounded-full bg-[#1a1a2e] border-2 transition-transform ${readingMode === 'dark' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-700'}`} />
          <button onClick={() => setReadingMode('high-contrast')} title="Alto Contraste" className={`w-7 h-7 rounded-full bg-black border-2 transition-transform ${readingMode === 'high-contrast' ? 'border-brand-500 scale-110 shadow-sm' : 'border-zinc-700'}`} />
        </div>
      </div>

      {/* 7. Largura do Texto */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold opacity-80">Largura do Texto</span>
        <div className={`flex items-center gap-1 ${trackBg} p-0.5 rounded-lg`}>
          <button 
            onClick={() => setTextWidth('narrow')}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'narrow' ? activeBtnClass : inactiveBtnClass}`}
          >
            Estreita
          </button>
          <button 
            onClick={() => setTextWidth('medium')}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'medium' ? activeBtnClass : inactiveBtnClass}`}
          >
            Média
          </button>
          <button 
            onClick={() => setTextWidth('full')}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${textWidth === 'full' ? activeBtnClass : inactiveBtnClass}`}
          >
            Larga
          </button>
        </div>
      </div>

      {/* 8. Leitura Contínua */}
      <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
        <div className="flex flex-col">
          <span className="text-xs font-semibold opacity-80">Leitura Contínua</span>
          <span className="text-[10px] opacity-60 font-normal">Rolar página verticalmente</span>
        </div>
        <button 
          onClick={() => setScrollMode(!scrollMode)}
          aria-label="Alternar leitura contínua"
          className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${scrollMode ? 'bg-brand-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
        >
          <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm absolute transition-transform ${scrollMode ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>

    </div>
  );
}

