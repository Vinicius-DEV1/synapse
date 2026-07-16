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
import { Table, TableRow, TableHeader } from '@tiptap/extension-table';
import { TableCell } from './editor-extensions/TableCell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';

import { Collaboration } from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { applyBase64StateToYDoc, getYDocStateAsBase64 } from '../utils/yjs-utils';
import { getSettings } from '../utils/settings';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';
import TableToolbar from './TableToolbar';
import ImageViewerModal from './ImageViewerModal';

// Nossos blocos
import { GroupBlock } from './editor-extensions/GroupBlock';
import { QuestionBlock } from './editor-extensions/QuestionBlock';
import { ToggleBlock } from './editor-extensions/ToggleBlock';
import { ColorBlockquote } from './editor-extensions/ColorBlockquote';
import { BlockquoteToggle } from './editor-extensions/BlockquoteToggle';
import { LinkPreviewBlock } from './editor-extensions/LinkPreviewBlock';
import { ResizableImage } from './editor-extensions/ResizableImage';
import { EncryptedImage } from './editor-extensions/EncryptedImage';
import { PageReference } from './editor-extensions/PageReference';
import CodeBlockComponent from './editor-extensions/CodeBlockComponent';
import { FocusWidgetBlock } from './editor-extensions/FocusWidgetBlock';
import { AlarmWidgetBlock } from './editor-extensions/AlarmWidgetBlock';
import { FileWidgetBlock } from './editor-extensions/FileWidgetBlock';
import SetupModal from './focus/SetupModal';
import AlarmSetupModal from './focus/AlarmSetupModal';
import { useFocusContext } from '../store/FocusContext';
import { uploadEncryptedImage, setCachedImage } from '../services/image-drive';
import FileUploadModal from './files/FileUploadModal';
import FileSelectModal from './files/FileSelectModal';
import FileWidgetNodeView from './editor-extensions/FileWidgetNodeView';

// Backup síncrono em memória: sobrevive ao unmount do componente.
// Se o save assíncrono falhar ou não completar, o backup é usado como fallback.
if (!(window as any).__cadernoEditorBackup) {
  (window as any).__cadernoEditorBackup = new Map<string, { html: string; crdt: string }>();
}

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

  // States para Foco e Alarme inline
  const [focusModal, setFocusModal] = useState<{ isOpen: boolean, initialTime?: number, initialTag?: string, initialDesc?: string } | null>(null);
  const [alarmModal, setAlarmModal] = useState<{ isOpen: boolean, initialTimeStr?: string } | null>(null);
  const [fileUploadModal, setFileUploadModal] = useState<{ isOpen: boolean, isLink: boolean } | null>(null);
  const [fileSelectModal, setFileSelectModal] = useState(false);
  const { handleStartTimer, handleSaveAlarm } = useFocusContext();

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<boolean>(false);
  const onSaveRef = useRef(onSave);
  const latestContentRef = useRef<{ html: string, crdt: string } | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    const handleSettingsChange = () => setSettings(getSettings());
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  // Um crdt_state "AAA=" (≤8 chars) é um Y.Doc vazio - tratar como null
  const hasMeaningfulCrdt = !!initialCrdtState && initialCrdtState.length > 8;

  if (!ydocRef.current || ydocRef.current.guid !== pageId) {
    if (ydocRef.current) {
      ydocRef.current.destroy(); // Fix Memory Leak!
    }
    ydocRef.current = new Y.Doc();
    ydocRef.current.guid = pageId || 'temp';
    console.log(`[Caderno:Mount] pageId=${pageId}, initialCrdtState=${initialCrdtState ? initialCrdtState.substring(0, 30) + '...' : 'NULL'} (meaningful=${hasMeaningfulCrdt}), initialContent.length=${initialContent?.length || 0}`);
    if (hasMeaningfulCrdt) {
      applyBase64StateToYDoc(ydocRef.current, initialCrdtState!);
    }
    // Recuperar edições não salvas do backup em memória (Y.js merge é seguro)
    const backup = (window as any).__cadernoEditorBackup?.get(pageId);
    console.log(`[Caderno:Mount] backup exists=${!!backup}, backup crdt=${backup?.crdt ? backup.crdt.substring(0, 30) + '...' : 'NULL'}`);
    if (backup?.crdt && backup.crdt.length > 8) {
      applyBase64StateToYDoc(ydocRef.current, backup.crdt);
      (window as any).__cadernoEditorBackup.delete(pageId);
      console.log(`[Caderno:Mount] backup applied and cleared for ${pageId}`);
    }
  }
  const needsLegacyHydration = !hasMeaningfulCrdt && !!initialContent && initialContent !== '' && !(window as any).__cadernoEditorBackup?.has(pageId);

  // Escuta atualizações puramente remotas (do CloudSync) via evento customizado, 
  // ignorando os updates locais que causavam lag.
  useEffect(() => {
    const handleRemoteUpdate = (e: CustomEvent) => {
      const { pageId: syncPageId, crdtState } = e.detail;
      if (syncPageId === pageId && ydocRef.current && crdtState) {
        applyBase64StateToYDoc(ydocRef.current, crdtState);
      }
    };
    window.addEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    
    // Cleanup de Memory Leak extra quando o componente for desmontado por completo
    return () => {
      window.removeEventListener('caderno-sync-update', handleRemoteUpdate as EventListener);
    };
  }, [pageId]);

  useEffect(() => {
    return () => {
      // Flush any pending save before component unmounts
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (latestContentRef.current && latestContentRef.current.crdt.length > 8) {
        // Só flush se o crdt_state NÃO for vazio (AAA= = 4 chars).
        // StrictMode pode causar um flush com crdt vazio durante inicialização.
        console.log(`[Caderno:Flush] Unmount flush for pageId=${pageId}, html.length=${latestContentRef.current.html.length}, crdt.length=${latestContentRef.current.crdt.length}`);
        const result = onSaveRef.current(latestContentRef.current.html, latestContentRef.current.crdt, []) as any;
        if (result && typeof result.catch === 'function') {
          result.then(() => console.log(`[Caderno:Flush] ✅ Flush save SUCCEEDED for ${pageId}`)).catch((err: any) => {
            console.error(`[Caderno:Flush] ❌ Flush save FAILED for ${pageId}:`, err);
          });
        }
      } else {
        console.log(`[Caderno:Flush] Skipped - ${!latestContentRef.current ? 'no content' : 'empty crdt'} for pageId=${pageId}`);
      }
      // ⚠️ NÃO destruir ydocRef.current aqui!
      // React StrictMode chama este cleanup durante o double-render.
      // Se destruirmos o Y.Doc, o editor (do useState no useEditor) fica
      // conectado a um Y.Doc destruído, e getYDocStateAsBase64() retorna AAA= (vazio).
      // A destruição do Y.Doc é feita no corpo do render quando um novo pageId chega.
    };
  }, []);

  const lowlight = createLowlight(common);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, 
        codeBlock: false,
        blockquote: false,
      }),
      ColorBlockquote,
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
      PageReference,
      FocusWidgetBlock,
      AlarmWidgetBlock,
      FileWidgetBlock
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
      latestContentRef.current = { html, crdt: crdtState };

      // Backup síncrono em memória - sobrevive ao unmount mesmo se o save async falhar
      if (pageId) {
        (window as any).__cadernoEditorBackup.set(pageId, { html, crdt: crdtState });
      }
      
      pendingSaveRef.current = true;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (!latestContentRef.current) return;
        console.log(`[Caderno:Debounce] Saving pageId=${pageId}, html.length=${latestContentRef.current.html.length}`);
        const saveResult = onSaveRef.current(latestContentRef.current.html, latestContentRef.current.crdt, []) as any;
        if (saveResult && typeof saveResult.then === 'function') {
          saveResult.then(() => {
            pendingSaveRef.current = false;
            console.log(`[Caderno:Debounce] ✅ Save SUCCEEDED for ${pageId}`);
          }).catch((err: any) => {
            console.error(`[Caderno:Debounce] ❌ Save FAILED for ${pageId}:`, err);
          });
        } else {
          pendingSaveRef.current = false;
          console.warn(`[Caderno:Debounce] ⚠️ onSave did NOT return a Promise for ${pageId}`);
        }
      }, 500); // Debounce de 500ms
    },
  }, [pageId]);

  useEffect(() => {
    if (editor && needsLegacyHydration && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
    // Only run once when editor first mounts for this page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (editor && editor.view) {
      editor.setOptions({
        editorProps: {
          attributes: {
            class: `editor-content min-h-[300px] leading-relaxed text-dark-text/90 focus:outline-none ${settings.fontSize} ai-highlight-${settings.aiChatHighlight || 'glow'}`,
            spellcheck: settings.spellcheck ? 'true' : 'false',
          }
        }
      });
    }
  }, [editor, settings.spellcheck, settings.fontSize, settings.aiChatHighlight]);

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
      case 'table-week': 
        editor.chain().focus().insertTable({ rows: 4, cols: 7, withHeaderRow: true }).run();
        // Option to pre-fill headers? Just create the table for now.
        break;
      case 'table-day': 
        editor.chain().focus().insertTable({ rows: 8, cols: 2, withHeaderRow: true }).run();
        break;
      case 'table-habit': 
        editor.chain().focus().insertTable({ rows: 5, cols: 8, withHeaderRow: true }).run();
        break;
      case 'foco': {
        const parts = slashMenu.query.trim().split(' ');
        let initialTime = 30;
        let initialTag = '';
        let initialDesc = '';
        
        parts.shift(); // remove the 'foco' or whatever command text if it was part of it, wait!
        // The query is what the user typed AFTER the slash, e.g. "foco 25 #Estudo Lendo"
        // So parts[0] is "foco".
        if (parts[0] && parts[0].toLowerCase() === 'foco') parts.shift();
        
        for (const p of parts) {
          if (!isNaN(Number(p)) && Number(p) > 0) {
            initialTime = Number(p);
          } else if (p.startsWith('#')) {
            initialTag = p.substring(1);
          } else {
            initialDesc += (initialDesc ? ' ' : '') + p;
          }
        }
        
        setFocusModal({ isOpen: true, initialTime, initialTag, initialDesc });
        break;
      }
      case 'alarme': {
        const parts = slashMenu.query.trim().split(' ');
        let initialTimeStr = '12:00';
        
        if (parts[0] && parts[0].toLowerCase() === 'alarme') parts.shift();
        
        for (const p of parts) {
          // If it matches HH:MM
          if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(p)) {
            initialTimeStr = p.padStart(5, '0');
          }
        }
        
        setAlarmModal({ isOpen: true, initialTimeStr });
        break;
      }
      case 'documento': {
        setFileUploadModal({ isOpen: true, isLink: false });
        break;
      }
      case 'documento-link': {
        setFileSelectModal(true);
        break;
      }
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

      {focusModal?.isOpen && createPortal(
        <SetupModal
          initialTag={focusModal.initialTag}
          initialDescription={focusModal.initialDesc}
          initialTargetTime={focusModal.initialTime}
          onStart={(tag, desc, time) => {
            setFocusModal(null);
            const sessionId = handleStartTimer(tag, desc, time);
            if (sessionId && editor) {
              editor.commands.insertFocusWidget({ sessionId, duration: time, tag, description: desc });
            }
          }}
          onCancel={() => setFocusModal(null)}
        />,
        document.body
      )}

      {alarmModal?.isOpen && createPortal(
        <AlarmSetupModal
          initialTimeStr={alarmModal.initialTimeStr}
          onSave={(alarm) => {
            setAlarmModal(null);
            const alarmId = Date.now().toString(); // local transient id for the widget
            const alarmToSave = { ...alarm, id: Number(alarmId) };
            handleSaveAlarm(alarmToSave);
            if (editor) {
              editor.commands.insertAlarmWidget({ alarmId, timeStr: alarm.time_str, label: alarm.label || '' });
            }
          }}
          onCancel={() => setAlarmModal(null)}
        />,
        document.body
      )}

      {fileUploadModal?.isOpen && createPortal(
        <FileUploadModal
          currentFolderId={null}
          onClose={() => setFileUploadModal(null)}
          onUploadComplete={async (file) => {
            setFileUploadModal(null);
            if (editor) {
              editor.commands.insertFileWidget({ 
                fileId: file.id, 
                name: file.name, 
                fileType: file.file_type, 
                isLink: fileUploadModal.isLink 
              });
              
              // Register the link in the backend
              if (window.api && window.api.files && window.api.files.links && pageId) {
                try {
                  await window.api.files.links.create({
                    id: crypto.randomUUID(),
                    file_id: file.id,
                    page_id: pageId,
                    link_type: fileUploadModal.isLink ? 'link' : 'embed',
                    widget_id: null
                  });
                } catch (e) {
                  console.error("Failed to link file to page", e);
                }
              }
            }
          }}
        />,
        document.body
      )}

      {fileSelectModal && createPortal(
        <FileSelectModal
          onClose={() => setFileSelectModal(false)}
          onSelect={async (item) => {
            setFileSelectModal(false);
            if (editor) {
              editor.commands.insertFileWidget({ 
                fileId: item.id, 
                name: item.name, 
                fileType: item.type, 
                isLink: true 
              });
              
              // Register the link in the backend
              if (window.api && window.api.files && window.api.files.links && pageId) {
                try {
                  await window.api.files.links.create({
                    id: crypto.randomUUID(),
                    file_id: item.id,
                    page_id: pageId,
                    link_type: 'link',
                    widget_id: null
                  });
                } catch (e) {
                  console.error("Failed to link item to page", e);
                }
              }
            }
          }}
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
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100, zIndex: 99999, maxWidth: 'calc(100vw - 32px)' }}
          shouldShow={({ state }) => {
            const { selection } = state;
            const isCellSelection = selection && (selection.constructor.name === 'CellSelection' || ('forEachCell' in selection));
            
            let isWidgetSelection = false;
            if (selection && 'node' in selection) {
              const node = (selection as any).node;
              if (node && (node.type.name === 'focusWidget' || node.type.name === 'alarmWidget' || node.type.name === 'fileWidget')) {
                isWidgetSelection = true;
              }
            }
            
            return !selection.empty && !isCellSelection && !isWidgetSelection;
          }}
        >
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

      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 100, zIndex: 99998, placement: 'bottom' }} 
          shouldShow={({ editor, state }) => {
            const { selection } = state;
            
            // Verifica se é uma seleção múltipla de células (drag)
            const isCellSelection = selection && (selection.constructor.name === 'CellSelection' || ('forEachCell' in selection));
            
            if (isCellSelection) return true;
            if (!selection.empty) return false; // Se tiver TEXTO selecionado, esconde para o menu normal brilhar
            
            return editor.isActive('table');
          }}
        >
          <TableToolbar editor={editor} />
        </BubbleMenu>
      )}

      {editor && <EditorContent editor={editor} />}
    </div>
  );
}
