import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { StarterKit } from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight, common } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Collaboration } from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { applyBase64StateToYDoc, getYDocStateAsBase64 } from '../utils/yjs-utils';
import { getSettings } from '../utils/settings';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';
import ImageViewerModal from './ImageViewerModal';

// Nossos blocos
import { GroupBlock } from './editor-extensions/GroupBlock';
import { QuestionBlock } from './editor-extensions/QuestionBlock';
import { ToggleBlock } from './editor-extensions/ToggleBlock';
import { BlockquoteToggle } from './editor-extensions/BlockquoteToggle';
import { LinkPreviewBlock } from './editor-extensions/LinkPreviewBlock';
import { ResizableImage } from './editor-extensions/ResizableImage';
import { EncryptedImage } from './editor-extensions/EncryptedImage';
import { PageReference } from './editor-extensions/PageReference';
import CodeBlockComponent from './editor-extensions/CodeBlockComponent';
import { uploadEncryptedImage, setCachedImage } from '../services/image-drive';

interface EditorProps {
  pageId: string | null;
  initialContent: string;
  initialCrdtState?: string | null;
  onSave: (content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => void;
  onCreateLinkedPage?: (title: string) => Promise<string>;
}

export default function Editor({ pageId, initialContent, initialCrdtState, onSave, onCreateLinkedPage }: EditorProps) {
  const [settings, setSettings] = useState(getSettings());
  const ydocRef = useRef<Y.Doc | null>(null);

  // States para Slash Menu manual
  const [slashMenu, setSlashMenu] = useState<{ query: string, startPos: number, x: number, y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // States para Image Viewer
  const [viewerState, setViewerState] = useState<{ isOpen: boolean, src: string, nodePos: number | null }>({ isOpen: false, src: '', nodePos: null });

  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  if (!ydocRef.current || ydocRef.current.guid !== pageId) {
    ydocRef.current = new Y.Doc();
    ydocRef.current.guid = pageId || 'temp';
    if (initialCrdtState) {
      applyBase64StateToYDoc(ydocRef.current, initialCrdtState);
    }
    // For legacy pages that have HTML content but no CRDT state,
    // we need to seed the Y.Doc AFTER the editor mounts.
    // This is handled by the immediatelyAfterCreate flag below.
  }
  const needsLegacyHydration = !initialCrdtState && !!initialContent && initialContent !== '';

  // Se o CloudSync puxar algo novo do banco de dados no background, injetamos na tela!
  useEffect(() => {
    if (ydocRef.current && initialCrdtState) {
      applyBase64StateToYDoc(ydocRef.current, initialCrdtState);
    }
  }, [initialCrdtState]);



  const lowlight = createLowlight(common);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, 
        codeBlock: false,
      }),
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockComponent);
        }
      }).configure({ lowlight }),
      Placeholder.configure({ placeholder: "Digite '/' para comandos ou comece a escrever..." }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({ openOnClick: false }),
      ResizableImage.configure({ inline: true }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      TaskList, TaskItem.configure({ nested: true }),
      Collaboration.configure({ document: ydocRef.current }),
      GroupBlock,
      QuestionBlock,
      ToggleBlock,
      BlockquoteToggle,
      LinkPreviewBlock,
      EncryptedImage,
      PageReference
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: `editor-content min-h-[300px] leading-relaxed text-dark-text/90 focus:outline-none ${settings.fontSize} ai-highlight-${settings.aiChatHighlight || 'glow'}`,
        spellcheck: settings.spellcheck ? 'true' : 'false',
      },
      handleClick: (view, pos, event) => {
        if (event.target && (event.target as HTMLElement).tagName === 'MARK') {
          const target = event.target as HTMLElement;
          const targetPos = view.posAtDOM(target, 0);
          const node = view.state.doc.nodeAt(targetPos);
          if (node) {
            editor?.commands.setTextSelection({ from: targetPos, to: targetPos + node.nodeSize });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        // Handle URL paste for Link Preview
        const textPasted = event.clipboardData?.getData('text/plain');
        if (textPasted) {
          const urlStr = textPasted.trim();
          let isUrl = false;
          try {
            new URL(urlStr);
            isUrl = urlStr.startsWith('http');
          } catch (e) { isUrl = false; }
          
          if (isUrl && view.state.selection.empty) {
            editor.chain().focus().insertContent({
              type: 'linkPreview',
              attrs: { url: urlStr, isLoading: true }
            }).run();
            event.preventDefault();
            return true;
          }
        }

        const items = Array.from(event.clipboardData?.items || []);
        let imagePasted = false;
        
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            imagePasted = true;
            const file = item.getAsFile();
            if (file && editor) {
              const masterKey = (window as any).__cadernoModuleKeys?.['notes'];
              
              if (masterKey) {
                const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);
                
                if (!(window as any).__pendingImageUploads) {
                  (window as any).__pendingImageUploads = new Map();
                }
                (window as any).__pendingImageUploads.set(tempId, file);

                // Cache local imediato: a imagem será exibida rápido e não será perdida se a página recarregar/renderizar
                file.arrayBuffer().then(buffer => {
                  setCachedImage(tempId, buffer, file.type).catch(console.error);
                });

                editor.chain().focus().insertContent({
                  type: 'encryptedImage',
                  attrs: { driveFileId: tempId }
                }).run();
              } else {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const src = e.target?.result;
                  if (src && editor) {
                    editor.chain().focus().setImage({ src: src as string }).run();
                  }
                };
                reader.readAsDataURL(file);
              }
            }
          }
        }
        if (imagePasted) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handleDoubleClickOn: (view, pos, node, nodePos, event, direct) => {
        if (node.type.name === 'image') {
          const src = node.attrs.src;
          if (src) {
            setViewerState({ isOpen: true, src, nodePos });
          }
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/') {
          const startPos = view.state.selection.$head.pos;
          const coords = view.coordsAtPos(startPos);
          const x = coords.left;
          const y = coords.top + 24; // 24px below cursor
          setSlashMenu({ query: '', startPos, x, y });
          return false;
        }
        if (slashMenu) {
          if (event.key === 'Escape' || event.key === ' ') {
            setSlashMenu(null);
            if (event.key === ' ') return false;
            return true;
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            setSlashMenu(null);
            return false; // let the cursor move
          }
          if (event.key === 'Backspace' && slashMenu.query.length === 0) {
            setSlashMenu(null);
            return false;
          }
          return false;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (!ydocRef.current) return;
      
      setSlashMenu(prev => {
        try {
          const currentPos = editor.state.selection.$head.pos;
          if (prev) {
            if (currentPos <= prev.startPos) return null; // fechou o menu apagando a barra
            const rawQuery = editor.state.doc.textBetween(prev.startPos, currentPos);
            const query = rawQuery.startsWith('/') ? rawQuery.substring(1) : rawQuery;
            const coords = editor.view.coordsAtPos(prev.startPos);
            return { ...prev, query, x: coords.left, y: coords.top + 24 };
          } else {
            // Mobile fallback: Check if user just typed a slash
            const { $head } = editor.state.selection;
            const textBefore = $head.parent.textBetween(0, $head.parentOffset);
            if (textBefore.endsWith(' /') || textBefore === '/') {
              const startPos = currentPos - 1;
              const coords = editor.view.coordsAtPos(startPos);
              return { query: '', startPos, x: coords.left, y: coords.top + 24 };
            }
            return null;
          }
        } catch (e) {
          return null;
        }
      });

      const html = editor.getHTML();
      const crdtState = getYDocStateAsBase64(ydocRef.current);
      onSave(html, crdtState, []); // Embeds saves serão tratados depois se necessário
    },
  }, [pageId]);

  useEffect(() => {
    if (editor && needsLegacyHydration && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
    // Only run once when editor first mounts for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  const executeSlashCommand = useCallback((commandId: string) => {
    if (!editor || !slashMenu) return;
    
    const startPos = slashMenu.startPos;
    const endPos = startPos + slashMenu.query.length + 1; 
    
    setSlashMenu(null);
    editor.commands.deleteRange({ from: startPos, to: endPos });

    switch (commandId) {
      case 'text': editor.commands.setParagraph(); break;
      case 'h1': editor.commands.toggleHeading({ level: 1 }); break;
      case 'h2': editor.commands.toggleHeading({ level: 2 }); break;
      case 'h3': editor.commands.toggleHeading({ level: 3 }); break;
      case 'todo': editor.commands.toggleTaskList(); break;
      case 'bullet': editor.commands.toggleBulletList(); break;
      case 'callout': editor.commands.toggleBlockquote(); break;
      case 'code': editor.commands.toggleCodeBlock(); break;
      case 'group': editor.commands.insertContent('<div class="group-collection"></div>'); break;
      case 'question': editor.commands.insertContent('<div class="question-block"></div>'); break;
      case 'toggle': editor.commands.insertContent('<div class="toggle-block"><p></p></div>'); break;
      case 'blockquoteToggle': editor.commands.insertContent('<div class="blockquote-toggle"><p></p></div>'); break;
      case 'divider': editor.commands.setHorizontalRule(); break;
      case 'table': 
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        break;
      default: break;
    }
  }, [editor, slashMenu]);

  return (
    <div className="relative tiptap-wrapper" ref={wrapperRef}>
      {editor && slashMenu && createPortal(
        <SlashMenu 
          x={slashMenu.x} y={slashMenu.y} 
          query={slashMenu.query} 
          onSelect={executeSlashCommand} 
          onClose={() => setSlashMenu(null)} 
        />,
        document.body
      )}

      {viewerState.isOpen && (
        <ImageViewerModal
          isOpen={viewerState.isOpen}
          imageSrc={viewerState.src}
          onClose={() => setViewerState({ isOpen: false, src: '', nodePos: null })}
          onSave={(croppedSrc) => {
            if (editor && viewerState.nodePos !== null) {
              editor.chain().focus().setNodeSelection(viewerState.nodePos).setImage({ src: croppedSrc }).run();
            }
            setViewerState({ isOpen: false, src: '', nodePos: null });
          }}
        />
      )}

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100, zIndex: 99999, maxWidth: 'calc(100vw - 32px)' }}>
          <FloatingToolbar 
            formatState={{
              bold: editor.isActive('bold'),
              italic: editor.isActive('italic'),
              strike: editor.isActive('strike'),
              underline: editor.isActive('underline'),
              code: editor.isActive('code'),
              highlight: editor.isActive('highlight'),
            }}
            onFormat={(cmd, value) => {
              if (cmd === 'bold') editor.commands.toggleBold();
              if (cmd === 'italic') editor.commands.toggleItalic();
              if (cmd === 'strike') editor.commands.toggleStrike();
              if (cmd === 'underline') editor.commands.toggleUnderline();
              if (cmd === 'code') editor.commands.toggleCode();
              if (cmd === 'highlight') {
                if (value) {
                  editor.commands.toggleHighlight({ color: value });
                } else {
                  editor.commands.toggleHighlight();
                }
              }
            }}
          />
        </BubbleMenu>
      )}

      {editor && <EditorContent editor={editor} />}
    </div>
  );
}
