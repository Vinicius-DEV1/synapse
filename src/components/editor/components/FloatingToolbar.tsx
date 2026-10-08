import { Bold, Italic, Underline, Palette, Strikethrough, Sparkles, Code, Link as LinkIcon, Check, X, Trash, EyeOff } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEXT_COLORS, BG_COLORS } from '../../../utils/colors';
import type { Editor } from '@tiptap/react';

interface FloatingToolbarProps {
  editor: Editor;
  onAiClick?: () => void;
}

export default function FloatingToolbar({ editor, onAiClick }: FloatingToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColors(false);
      }
      if (linkInputRef.current && !linkInputRef.current.contains(e.target as Node)) {
        setShowLinkInput(false);
      }
    };

    if (showColors || showLinkInput) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColors, showLinkInput]);

  const handleFormat = (command: string, value?: string) => {
    if (!editor) return;

    switch (command) {
      case 'bold':
        editor.chain().focus().toggleBold().run();
        break;
      case 'italic':
        editor.chain().focus().toggleItalic().run();
        break;
      case 'underline':
        editor.chain().focus().toggleUnderline().run();
        break;
      case 'strike':
        editor.chain().focus().toggleStrike().run();
        break;
      case 'code':
        editor.chain().focus().toggleCode().run();
        break;
      case 'spoiler':
        editor.chain().focus().toggleSpoiler().run();
        break;
      case 'link':
        if (value) {
          editor.chain().focus().setLink({ href: value }).run();
        }
        break;
      case 'unlink':
        editor.chain().focus().unsetLink().run();
        break;
      case 'color':
        if (value && value !== 'inherit') {
          editor.chain().focus().setColor(value).run();
        } else {
          editor.chain().focus().unsetColor().run();
        }
        break;
      case 'highlight':
        if (value) {
          editor.chain().focus().toggleHighlight({ color: value }).run();
        } else {
          editor.chain().focus().unsetHighlight().run();
        }
        break;
    }
  };

  const submitLink = () => {
    let trimmed = linkUrl.trim();
    if (trimmed) {
      if (
        !/^https?:\/\//i.test(trimmed) &&
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('#') &&
        !trimmed.startsWith('mailto:')
      ) {
        trimmed = `https://${trimmed}`;
      }
      handleFormat('link', trimmed);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitLink();
    if (e.key === 'Escape') setShowLinkInput(false);
  };

  const rawTextColor = editor.getAttributes('textStyle')?.color;
  const currentTextColor = typeof rawTextColor === 'string' ? rawTextColor : undefined;

  const formatState = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    strike: editor.isActive('strike'),
    underline: editor.isActive('underline'),
    code: editor.isActive('code'),
    spoiler: editor.isActive('spoiler'),
    highlight: editor.isActive('highlight'),
    textColor: currentTextColor,
    link: editor.isActive('link'),
    linkHref: editor.getAttributes('link').href,
  };

  const activeClass = "bg-white/10 text-brand-400";
  const inactiveClass = "text-dark-subtext hover:bg-white/10 hover:text-brand-400";

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-dark-bg/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-fade-in-up">
      {showLinkInput ? (
        <div className="flex items-center gap-1" ref={linkInputRef}>
          <input
            type="url"
            autoFocus
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cole o link aqui..."
            className="w-48 bg-black/20 border border-white/10 rounded-md text-sm px-2 py-1 focus:outline-none focus:border-brand-500/50 text-white placeholder-white/30"
          />
          <button onClick={submitLink} className="p-1 hover:bg-white/10 rounded text-brand-400" title="Salvar"><Check size={16} /></button>
          {formatState?.link && (
            <button 
              onClick={() => { handleFormat('unlink'); setShowLinkInput(false); }} 
              className="p-1 hover:bg-white/10 rounded text-red-400"
              title="Remover Link"
            >
              <Trash size={15} />
            </button>
          )}
          <button onClick={() => setShowLinkInput(false)} className="p-1 hover:bg-white/10 rounded text-dark-subtext" title="Cancelar"><X size={16} /></button>
        </div>
      ) : (
        <>
          <button
            onClick={() => handleFormat('bold')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.bold ? activeClass : inactiveClass}`}
            title="Negrito (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            onClick={() => handleFormat('italic')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.italic ? activeClass : inactiveClass}`}
            title="Itálico (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            onClick={() => handleFormat('strike')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.strike ? activeClass : inactiveClass}`}
            title="Riscar"
          >
            <Strikethrough size={15} />
          </button>
          <button
            onClick={() => handleFormat('underline')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.underline ? activeClass : inactiveClass}`}
            title="Sublinhado"
          >
            <Underline size={15} />
          </button>
          <button
            onClick={() => handleFormat('code')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.code ? activeClass : inactiveClass}`}
            title="Código"
          >
            <Code size={15} />
          </button>

          <button
            onClick={() => {
              if (formatState?.linkHref) {
                setLinkUrl(formatState.linkHref);
              } else {
                setLinkUrl('');
              }
              setShowLinkInput(true);
            }}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.link ? activeClass : inactiveClass}`}
            title={formatState?.link ? "Editar/Remover Link" : "Adicionar Link"}
          >
            <LinkIcon size={15} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColors(!showColors)}
              className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.highlight || !!formatState?.textColor ? activeClass : inactiveClass}`}
              title="Cores e Destaque"
            >
              <Palette size={15} />
            </button>
            {showColors && (
              <div
                ref={colorMenuRef}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-2.5 shadow-2xl flex flex-col gap-2 min-w-[210px] z-50 animate-scale-in"
              >
                {/* Cor do Texto */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-bold text-dark-subtext uppercase tracking-wider">
                      Cor do Texto
                    </span>
                    {formatState?.textColor && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFormat('color', '');
                          setShowColors(false);
                        }}
                        className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                        title="Restaurar cor padrão"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={`text-${c.name}`}
                        type="button"
                        onClick={() => {
                          handleFormat('color', c.value);
                          setShowColors(false);
                        }}
                        className="w-6 h-6 rounded-full border border-white/15 hover:scale-110 hover:border-brand-400 transition-all flex items-center justify-center text-[10px] font-bold"
                        style={{
                          backgroundColor: c.value === 'inherit' ? '#262533' : c.hex,
                          color: '#fff',
                        }}
                        title={c.value === 'inherit' ? 'Cor padrão' : c.name}
                      >
                        {c.value === 'inherit' ? 'A' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/5" />

                {/* Destaque (Marca-texto) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    <span className="text-[10px] font-bold text-dark-subtext uppercase tracking-wider">
                      Destaque
                    </span>
                    {formatState?.highlight && (
                      <button
                        type="button"
                        onClick={() => {
                          handleFormat('highlight', '');
                          setShowColors(false);
                        }}
                        className="text-[10px] text-brand-400 hover:text-brand-300 transition-colors"
                        title="Remover destaque"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BG_COLORS.map((color) => (
                      <button
                        key={`bg-${color.name}`}
                        type="button"
                        onClick={() => {
                          if (color.value === 'transparent') {
                            handleFormat('highlight', '');
                          } else {
                            handleFormat('highlight', color.hex);
                          }
                          setShowColors(false);
                        }}
                        className="w-6 h-6 rounded-md border border-white/15 hover:scale-110 hover:border-brand-400 transition-all flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: color.value === 'transparent' ? '#262533' : color.hex,
                          color: color.hex === 'transparent' ? 'rgba(255,255,255,0.4)' : '#fff',
                        }}
                        title={color.value === 'transparent' ? 'Sem destaque' : color.name}
                      >
                        {color.value === 'transparent' ? <X size={12} /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => handleFormat('spoiler')}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.spoiler ? activeClass : inactiveClass}`}
            title="Ocultar com Fumaça / Spoiler (Ctrl+Shift+S)"
          >
            <EyeOff size={15} />
          </button>

          {onAiClick && (
            <button
              onClick={onAiClick}
              className="p-1.5 rounded-lg hover:bg-white/10 text-dark-subtext hover:text-brand-400 transition-all active:scale-90 ml-1 group"
              title="Assistente IA"
            >
              <Sparkles size={15} className="group-hover:animate-pulse text-brand-400" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
