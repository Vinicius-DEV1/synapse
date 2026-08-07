import { Bold, Italic, Underline, Palette, Strikethrough, Sparkles, Code, Link as LinkIcon, Check, X, Trash } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { BG_COLORS } from '../utils/colors';
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
      case 'link':
        if (value) {
          editor.chain().focus().setLink({ href: value }).run();
        }
        break;
      case 'unlink':
        editor.chain().focus().unsetLink().run();
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
    if (linkUrl.trim()) {
      handleFormat('link', linkUrl.trim());
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitLink();
    if (e.key === 'Escape') setShowLinkInput(false);
  };

  const formatState = {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    strike: editor.isActive('strike'),
    underline: editor.isActive('underline'),
    code: editor.isActive('code'),
    highlight: editor.isActive('highlight'),
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
              className={`p-1.5 rounded-lg transition-all active:scale-90 ${formatState?.highlight ? activeClass : inactiveClass}`}
              title="Destaque"
            >
              <Palette size={15} />
            </button>
            {showColors && (
              <div ref={colorMenuRef} className="absolute bottom-full mb-2 left-0 bg-dark-card border border-white/10 rounded-xl p-2 shadow-xl flex gap-1 z-50">
                {BG_COLORS.filter(c => c.value !== 'transparent').map(color => (
                  <button 
                    key={color.name}
                    onClick={() => { handleFormat('highlight', color.hex); setShowColors(false); }}
                    className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
                <button 
                  onClick={() => { handleFormat('highlight', ''); setShowColors(false); }}
                  className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform bg-transparent flex items-center justify-center text-white/50 hover:text-white"
                  title="Remover Destaque"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              </div>
            )}
          </div>

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
