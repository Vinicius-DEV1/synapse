import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { GripVertical, Plus, ArrowUp, ArrowDown, Copy, Check, Trash2, Code2, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { selectNodeForDrag } from './group-layout/DragToGroup';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import { Portal } from '../ui/Portal';

export default function CodeBlockComponent(props: NodeViewProps) {
  const { node, updateAttributes, extension, editor, getPos, deleteNode } = props;
  const defaultLanguage = (node.attrs.language as string | null) || null;
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const floatingConfirmRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const parent = confirmRef.current?.closest('.code-block-wrapper');
      if (parent) {
        parent.classList.remove('opacity-40');
      }
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const { refs, floatingStyles, isPositioned } = useFloating({
    elements: {
      reference: confirmRef.current,
    },
    placement: 'bottom-end',
    middleware: [offset(4), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (confirmRef.current) {
      refs.setReference(confirmRef.current);
    }
  }, [refs]);

  // Preserve uninterrupted vertical page scroll when cursor is over code block
  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const handleWheel = (e: WheelEvent) => {
      // 1. Check for intentional horizontal scrolling:
      // Either holding Shift (standard desktop convention) or trackpad gesture predominantly horizontal
      const isHorizontalIntent = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);

      if (isHorizontalIntent) {
        // Translate Shift + vertical wheel into horizontal code scroll
        if (e.shiftKey && Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0) {
          const maxScroll = pre.scrollWidth - pre.clientWidth;
          if (maxScroll > 0) {
            e.preventDefault();
            let delta = e.deltaY;
            if (e.deltaMode === 1) delta *= 35;
            else if (e.deltaMode === 2) delta *= 100;
            pre.scrollLeft += delta;
          }
        }
        return;
      }

      // 2. Vertical scroll intent:
      // Prevent Linux / WebKitGTK / Chromium from hijacking deltaY into horizontal scroll
      // or latching the scroll gesture to this container. Forward vertical scroll to page container.
      const scrollParent =
        pre.closest<HTMLElement>('#page-view-scroll, .overflow-y-auto') ||
        document.getElementById('page-view-scroll');

      if (scrollParent) {
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 35;
        else if (e.deltaMode === 2) delta *= 100;

        if (delta !== 0) {
          e.preventDefault();
          scrollParent.scrollTop += delta;
        }
      }
    };

    pre.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      pre.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as globalThis.Node;
      if (
        floatingConfirmRef.current &&
        !floatingConfirmRef.current.contains(target) &&
        (!confirmRef.current || !confirmRef.current.contains(target))
      ) {
        setShowConfirm(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowConfirm(false);
    };

    if (showConfirm) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfirm]);

  const handleDragMouseDown = () => {
    if (typeof getPos === 'function' && editor?.view) {
      const pos = getPos();
      if (typeof pos === 'number') {
        selectNodeForDrag(editor.view, pos, node);
      }
    }
  };

  const handleCopy = () => {
    const text = node.textContent || '';
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Falha ao copiar código:', err);
      });
  };

  const languages = extension.options.lowlight?.listLanguages?.().sort() || [];

  return (
    <NodeViewWrapper className="code-block-wrapper relative group/code my-4">
      {/* Alça e controles verticais no gutter esquerdo */}
      <div
        contentEditable={false}
        className="absolute -left-7 top-1 z-20 flex flex-col items-center gap-0.5 rounded-md border border-white/10 bg-dark-bg/90 p-0.5 text-dark-subtext opacity-0 shadow-lg backdrop-blur-xl transition-all group-hover/code:opacity-100"
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function' && editor) {
              const pos = getPos();
              if (typeof pos === 'number') moveBlockUp(editor.view, pos);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Subir bloco de código (Mover para cima)"
        >
          <ArrowUp size={11} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function' && editor) {
              const pos = getPos();
              if (typeof pos === 'number') {
                editor.chain().focus().insertContentAt(pos + node.nodeSize, { type: 'paragraph' }).run();
              }
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Adicionar linha abaixo (+)"
        >
          <Plus size={11} />
        </button>
        <div
          data-drag-handle
          onMouseDown={handleDragMouseDown}
          className="p-0.5 cursor-grab active:cursor-grabbing hover:text-white transition-colors"
          title="Arrastar bloco de código"
        >
          <GripVertical size={13} />
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof getPos === 'function' && editor) {
              const pos = getPos();
              if (typeof pos === 'number') moveBlockDown(editor.view, pos);
            }
          }}
          className="p-1 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Descer bloco de código (Mover para baixo)"
        >
          <ArrowDown size={11} />
        </button>
      </div>

      {/* Card da Janela de Código */}
      <div className="rounded-xl border border-white/10 bg-[#0d1117] shadow-xl overflow-hidden transition-all group-hover/code:border-white/20">
        {/* Barra Superior / Header do Terminal */}
        <div
          contentEditable={false}
          className="flex items-center justify-between px-3 py-2 bg-[#161b22]/90 border-b border-white/5 select-none backdrop-blur-md"
        >
          {/* Lado esquerdo: bolinhas macOS e seletor de linguagem */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]/70 group-hover/code:bg-[#ff5f56] transition-colors" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]/70 group-hover/code:bg-[#ffbd2e] transition-colors" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]/70 group-hover/code:bg-[#27c93f] transition-colors" />
            </div>

            <div className="h-3 w-px bg-white/10" />

            <div className="flex items-center gap-1.5">
              <Code2 size={13} className="text-brand-400 opacity-80" />
              <div className="relative inline-flex items-center">
                <select
                  value={defaultLanguage || 'auto'}
                  onChange={(event) => {
                    const val = event.target.value;
                    updateAttributes({ language: val === 'auto' ? null : val });
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="appearance-none !bg-[#161b22] hover:!bg-[#1c2128] !text-zinc-200 text-[11px] font-medium border border-white/10 hover:border-white/20 rounded-md pl-2 pr-5 py-0.5 outline-none cursor-pointer transition-colors focus:border-brand-500/50"
                >
                  <option className="!bg-[#161b22] !text-white" value="auto">
                    Auto
                  </option>
                  <option className="!bg-[#161b22] !text-white/40" disabled>
                    ──────────
                  </option>
                  {languages.map((lang: string) => (
                    <option className="!bg-[#161b22] !text-white" key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-1.5 pointer-events-none text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Lado direito: Copiar e Excluir */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-dark-subtext hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all cursor-pointer"
              title="Copiar código"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copiar</span>
                </>
              )}
            </button>

            <div className="relative" ref={confirmRef}>
              <button
                onClick={() => setShowConfirm(!showConfirm)}
                className="p-1 rounded-md text-dark-subtext hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer flex items-center justify-center"
                title="Excluir bloco de código"
              >
                <Trash2 size={12} />
              </button>

              {showConfirm && (
                <Portal>
                  <div
                    ref={(node) => {
                      refs.setFloating(node);
                      (floatingConfirmRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    }}
                    style={{
                      ...floatingStyles,
                      zIndex: 9999,
                      visibility: isPositioned ? 'visible' : 'hidden',
                      opacity: isPositioned ? 1 : 0,
                      pointerEvents: isPositioned ? 'auto' : 'none',
                    }}
                    className={`fixed bg-dark-bg border border-white/10 rounded-lg p-2 shadow-xl z-50 flex flex-col gap-2 min-w-[140px] ${
                      isPositioned ? 'animate-in fade-in zoom-in-95' : ''
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-xs text-white">Excluir código?</span>
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setShowConfirm(false)}
                        className="px-2 py-1 text-xs text-dark-subtext hover:text-white rounded hover:bg-white/5"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => {
                          setShowConfirm(false);
                          deleteNode();
                        }}
                        className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded"
                      >
                        Sim
                      </button>
                    </div>
                  </div>
                </Portal>
              )}
            </div>
          </div>
        </div>

        {/* Área de Código */}
        <pre
          ref={preRef}
          className="hljs !bg-transparent !p-4 !m-0 font-mono text-[13.5px] leading-relaxed overflow-x-auto overflow-y-hidden custom-scrollbar"
          spellCheck={false}
        >
          <NodeViewContent<'code'> as="code" className="font-mono" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
