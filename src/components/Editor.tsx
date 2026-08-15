import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { getSettings } from '../utils/settings';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';
import TableToolbar from './TableToolbar';
import ImageViewerModal from './ImageViewerModal';
import PageSearchMenu from './PageSearchMenu';

import SetupModal from './focus/SetupModal';
import AlarmSetupModal from './focus/AlarmSetupModal';
import { useFocusContext } from '../store/FocusContext';
import { uploadEncryptedImage, setCachedImage } from '../services/image-drive';
import FileUploadModal from './files/FileUploadModal';
import FileSelectModal from './files/FileSelectModal';
import { useStore } from '../store/useStore';
import CalendarEventModal from './editor-extensions/CalendarEventModal';
import MediaSelectModal from './MediaSelectModal';
import MediaActionModal from './MediaActionModal';
import FileActionModal from './FileActionModal';
import ImageDeleteModal from './ImageDeleteModal';

import { useEditorSync } from './editor/hooks/useEditorSync';
import { useEditorSave } from './editor/hooks/useEditorSave';
import { useSlashCommand } from './editor/hooks/useSlashCommand';
import { useEditorExtensions } from './editor/hooks/useEditorExtensions';
import { applyGroupDrop, consumeGroupDropTarget } from './editor-extensions/group-layout';
import { deleteImageAt, findNodePos } from './editor-extensions/image/imageUtils';
import type { Node as PMNode } from '@tiptap/pm/model';

interface EditorProps {
  pageId: string | null;
  initialContent: string;
  initialCrdtState?: string | null;
  onSave: (content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => void;
  onCreateLinkedPage?: (title: string) => Promise<string>;
}

export default function Editor({ pageId, initialContent, initialCrdtState, onSave, onCreateLinkedPage }: EditorProps) {
  const [settings, setSettings] = useState(getSettings());
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Viewer State
  const [viewerState, setViewerState] = useState<{ isOpen: boolean, src: string, nodePos: number | null, nodeType: string | null }>({ isOpen: false, src: '', nodePos: null, nodeType: null });

  // Modals States
  const [focusModal, setFocusModal] = useState<{ isOpen: boolean, initialTime?: number, initialTag?: string, initialDesc?: string } | null>(null);
  const [alarmModal, setAlarmModal] = useState<{ isOpen: boolean, initialTimeStr?: string } | null>(null);
  const [fileUploadModal, setFileUploadModal] = useState<{ isOpen: boolean, isLink: boolean } | null>(null);
  const [fileSelectModal, setFileSelectModal] = useState(false);
  const [pageSearchMenu, setPageSearchMenu] = useState<{ isOpen: boolean, x: number, y: number, query: string } | null>(null);
  const [calendarEventModal, setCalendarEventModal] = useState<{ isOpen: boolean, initialTitle?: string } | null>(null);
  const [mediaSelectModal, setMediaSelectModal] = useState<{ isOpen: boolean, type: 'video' | 'book' } | null>(null);
  const [mediaActionModal, setMediaActionModal] = useState<{ isOpen: boolean, mediaId: string, mediaType: 'video' | 'book', title: string } | null>(null);
  const [fileActionModal, setFileActionModal] = useState<{ isOpen: boolean, fileId: string, title: string } | null>(null);
  // Guardamos o NODE, não só a posição: entre abrir o modal e confirmar, a
  // posição pode mudar (edição em outra aba, sincronização CRDT, undo).
  const [imageToDelete, setImageToDelete] = useState<{ node: PMNode, pos: number | null } | null>(null);
  
  const { state } = useStore();
  const currentPage = state.pages.find(p => p.id === pageId);
  
  const { handleStartTimer, handleSaveAlarm } = useFocusContext();

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

  // 1. Sync & Collab
  const { ydocRef } = useEditorSync({
    pageId,
    initialCrdtState,
    initialContent,
    onSaveRef,
    latestContentRef
  });

  // 2. Extensions
  const extensions = useEditorExtensions(ydocRef.current);

  // 3. Save Logic
  const { handleUpdate, cleanupSave } = useEditorSave({
    pageId,
    ydocRef,
    onSaveRef,
    latestContentRef
  });

  useEffect(() => {
    return () => {
      cleanupSave();
    };
  }, [pageId, cleanupSave]);

  useEffect(() => {
    const handleOpenImageViewer = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.src) {
        setViewerState({
          isOpen: true,
          src: detail.src,
          nodePos: typeof detail.nodePos === 'number' ? detail.nodePos : null,
          nodeType: detail.nodeType || null,
        });
      }
    };
    window.addEventListener('open-image-viewer', handleOpenImageViewer);
    return () => window.removeEventListener('open-image-viewer', handleOpenImageViewer);
  }, []);

  useEffect(() => {
    const handleOpenMediaAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMediaActionModal({ isOpen: true, mediaId: detail.mediaId, mediaType: detail.mediaType, title: detail.title });
    };
    window.addEventListener('open-media-action', handleOpenMediaAction);
    return () => window.removeEventListener('open-media-action', handleOpenMediaAction);
  }, []);

  useEffect(() => {
    const handleOpenFileAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setFileActionModal({ isOpen: true, fileId: detail.fileId, title: detail.title });
    };
    window.addEventListener('open-file-action', handleOpenFileAction);
    return () => window.removeEventListener('open-file-action', handleOpenFileAction);
  }, []);

  useEffect(() => {
    const handleRequestImageDelete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.node) {
        setImageToDelete({ node: detail.node, pos: typeof detail.pos === 'number' ? detail.pos : null });
      }
    };
    window.addEventListener('request-image-delete', handleRequestImageDelete);
    return () => window.removeEventListener('request-image-delete', handleRequestImageDelete);
  }, []);

  // 4. Slash Commands
  const {
    slashMenu,
    setSlashMenu,
    handleSlashKeyDown,
    updateSlashMenuOnUpdate,
    executeSlashCommand
  } = useSlashCommand({
    setPageSearchMenu,
    setFocusModal,
    setAlarmModal,
    setFileUploadModal,
    setFileSelectModal,
    setCalendarEventModal,
    setMediaSelectModal
  });

  const editor = useEditor({
    extensions,
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
        const targetElement = event.target as HTMLElement;
        const link = targetElement.closest('a');
        if (link && link.href) {
          window.open(link.href, '_blank');
          return true;
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        const textPasted = event.clipboardData?.getData('text/plain');
        if (textPasted) {
          const urlStr = textPasted.trim();
          let isUrl = false;
          try {
            new URL(urlStr);
            isUrl = urlStr.startsWith('http');
          } catch (e) { isUrl = false; }
          
          if (isUrl && view.state.selection.empty) {
            editor?.chain().focus().insertContent({
              type: 'linkPreview',
              attrs: { url: urlStr, isLoading: true }
            }).run();
            event.preventDefault();
            return true;
          }
        }

        const items = Array.from(event.clipboardData?.items || []);
        let imagePasted = false;
        
        const nodesToInsert: any[] = [];
        const readers: Promise<{src: string}>[] = [];
        const masterKey = state.moduleKeys?.['notes'];

        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            imagePasted = true;
            const file = item.getAsFile();
            if (file && editor) {
              if (masterKey) {
                const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);
                if (!window.__pendingImageUploads) {
                  window.__pendingImageUploads = new Map();
                }
                window.__pendingImageUploads.set(tempId, file);
                file.arrayBuffer().then(buffer => {
                  setCachedImage(tempId, buffer, file.type).catch(console.error);
                }).catch(console.error);
                
                nodesToInsert.push({ type: 'encryptedImage', attrs: { driveFileId: tempId } });
              } else {
                if (file.size > 2 * 1024 * 1024) {
                  alert('Imagem muito grande para colar sem criptografia (limite 2MB). Reduza o tamanho ou espere a sincronização.');
                  continue;
                }
                readers.push(new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = (e) => resolve({ src: e.target?.result as string });
                  reader.readAsDataURL(file);
                }));
              }
            }
          }
        }
        
        if (imagePasted) {
          if (masterKey && nodesToInsert.length > 0) {
            editor?.chain().focus().insertContent(nodesToInsert).run();
          } else if (readers.length > 0) {
            const { from } = view.state.selection;
            Promise.all(readers).then((results) => {
              if (editor) {
                const nodes = results.map(r => ({ type: 'image', attrs: { src: r.src } }));
                editor.chain().insertContentAt(from, nodes).focus().run();
              }
            });
          }
          event.preventDefault();
          return true;
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const files = Array.from(event.dataTransfer.files);
          let imageDropped = false;
          
          const nodesToInsert: any[] = [];
          const readers: Promise<{src: string}>[] = [];
          const masterKey = state.moduleKeys?.['notes'];
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const pos = coordinates ? coordinates.pos : undefined;
          
          for (const file of files) {
            if (file.type.indexOf('image') === 0) {
              imageDropped = true;
              if (editor) {
                if (masterKey) {
                  const tempId = 'uploading_' + Date.now() + Math.random().toString(36).substring(2, 6);
                  if (!window.__pendingImageUploads) {
                    window.__pendingImageUploads = new Map();
                  }
                  window.__pendingImageUploads.set(tempId, file);
                  file.arrayBuffer().then(buffer => {
                    setCachedImage(tempId, buffer, file.type).catch(console.error);
                  }).catch(console.error);
                  
                  nodesToInsert.push({ type: 'encryptedImage', attrs: { driveFileId: tempId } });
                } else {
                  if (file.size > 2 * 1024 * 1024) {
                    alert('Imagem muito grande para colar sem criptografia (limite 2MB). Reduza o tamanho ou espere a sincronização.');
                    continue;
                  }
                  readers.push(new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve({ src: e.target?.result as string });
                    reader.readAsDataURL(file);
                  }));
                }
              }
            }
          }
          
          if (imageDropped) {
            // Consumido AQUI porque `editorProps.handleDrop` roda antes do
            // `handleDrop` dos plugins — antes isso era lido de um global
            // preenchido tarde demais e nunca batia com o arrasto atual.
            const columnTarget = consumeGroupDropTarget();

            const insertNodes = (nodes: any[]) => {
              if (!editor || nodes.length === 0) return;

              if (columnTarget) {
                const pmNodes = nodes.map(n => editor.schema.nodeFromJSON(n));
                if (applyGroupDrop(editor.view, columnTarget, pmNodes)) return;
                // Se o layout de colunas não pôde ser criado, insere normalmente.
              }

              if (pos !== undefined) {
                editor.chain().insertContentAt(pos, nodes).focus().run();
              } else {
                editor.chain().focus().insertContent(nodes).run();
              }
            };

            if (masterKey && nodesToInsert.length > 0) {
              insertNodes(nodesToInsert);
            } else if (readers.length > 0) {
              Promise.all(readers).then((results) => {
                insertNodes(results.map(r => ({ type: 'image', attrs: { src: r.src } })));
              });
            }
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
      // Backspace/Delete perto de imagens é tratado pela extensão ImageKeymap
      // (seleciona na primeira tecla, apaga na segunda) — sem modal bloqueando
      // a digitação normal.
      handleKeyDown: (view, event) => handleSlashKeyDown(view, event)
    },
    onUpdate: (props) => {
      handleUpdate(props);
      updateSlashMenuOnUpdate(props.editor);
    }
  }, [pageId]);

  /**
   * Recebe o recorte feito no visualizador e grava de volta no node.
   * Para imagens criptografadas o recorte precisa ser reenviado ao Drive —
   * antes esse fluxo simplesmente não existia (o `onSave` nunca era ligado).
   */
  const handleCroppedImage = useCallback(async (croppedDataUrl: string) => {
    if (!editor || viewerState.nodePos === null) {
      setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
      return;
    }

    const pos = viewerState.nodePos;
    const node = editor.state.doc.nodeAt(pos);
    setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
    if (!node) return;

    try {
      if (node.type.name === 'encryptedImage') {
        const masterKey = state.moduleKeys?.['notes'];
        if (!masterKey) {
          alert('Desbloqueie o cofre de notas para salvar o recorte.');
          return;
        }
        const blob = await (await fetch(croppedDataUrl)).blob();
        const file = new File([blob], 'imagem-recortada.jpg', { type: blob.type || 'image/jpeg' });
        const driveFileId = await uploadEncryptedImage(file, masterKey);

        const currentPos = findNodePos(editor.state.doc, node, pos);
        if (currentPos === null) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(currentPos, undefined, {
            ...node.attrs,
            driveFileId,
            width: null,
            height: null,
          })
        );
      } else {
        const currentPos = findNodePos(editor.state.doc, node, pos);
        if (currentPos === null) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(currentPos, undefined, {
            ...node.attrs,
            src: croppedDataUrl,
            width: null,
            height: null,
          })
        );
      }
    } catch (err) {
      console.error('[Editor] Falha ao salvar o recorte da imagem:', err);
      alert('Não foi possível salvar o recorte da imagem.');
    }
  }, [editor, viewerState.nodePos, state.moduleKeys]);

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

  return (
    <div className="relative" ref={wrapperRef}>
      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ 
            duration: 150, 
            maxWidth: 800,
            placement: 'top',
            offset: [0, 8]
          }} 
          shouldShow={({ editor }) => 
            !editor.state.selection.empty && 
            !editor.isActive('image') && 
            !editor.isActive('encryptedImage') && 
            !editor.isActive('resizableImage')
          }
          className="flex shadow-elevated rounded-xl overflow-visible border border-white/5 bg-dark-bg/80 backdrop-blur-xl"
        >
          <FloatingToolbar editor={editor} />
        </BubbleMenu>
      )}

      {editor && (
        <BubbleMenu 
          editor={editor} 
          tippyOptions={{ duration: 150, placement: 'bottom' }} 
          pluginKey="tableBubbleMenu"
          shouldShow={({ editor }) => editor.isActive('table')}
          className="flex shadow-elevated rounded-xl overflow-hidden border border-white/5 bg-dark-bg/80 backdrop-blur-xl mt-2"
        >
          <TableToolbar editor={editor} />
        </BubbleMenu>
      )}

      <div className="editor-container relative z-0">
        <EditorContent editor={editor} />
      </div>

      {slashMenu && (
        <SlashMenu 
          query={slashMenu.query}
          x={slashMenu.x}
          y={slashMenu.y}
          onSelect={(id) => executeSlashCommand(id, editor)}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {pageSearchMenu && (
        <PageSearchMenu
          query={pageSearchMenu.query}
          x={pageSearchMenu.x}
          y={pageSearchMenu.y}
          onClose={() => setPageSearchMenu(null)}
          onSelect={async (selectedPageId, title) => {
            let finalId = selectedPageId;
            if (selectedPageId === 'new' && onCreateLinkedPage) {
              finalId = await onCreateLinkedPage(title);
            }
            if (finalId && editor) {
              const startPos = slashMenu ? slashMenu.startPos : editor.state.selection.$head.pos - pageSearchMenu.query.length - 1;
              const endPos = editor.state.selection.$head.pos;
              
              editor.commands.deleteRange({ from: startPos, to: endPos });
              editor.chain().focus().insertContent({
                type: 'pageReference',
                attrs: { pageId: finalId, title: title }
              }).run();
            }
            setPageSearchMenu(null);
            setSlashMenu(null);
          }}
        />
      )}

      {/* O visualizador espera `isOpen`/`imageSrc`/`onSave`. Antes recebia
          `src`/`onSaveSize`, então `isOpen` era `undefined` e o modal NUNCA
          abria — dar duplo clique numa imagem não fazia nada. */}
      <ImageViewerModal
        isOpen={viewerState.isOpen}
        imageSrc={viewerState.src}
        onClose={() => setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null })}
        onSave={handleCroppedImage}
      />

      {focusModal?.isOpen && (
        <SetupModal
          isOpen={true}
          onClose={() => setFocusModal(null)}
          onStart={(t, tag, d) => {
            handleStartTimer(t, tag, d);
            setFocusModal(null);
          }}
          initialTime={focusModal.initialTime}
          initialTag={focusModal.initialTag}
          initialDesc={focusModal.initialDesc}
        />
      )}

      {alarmModal?.isOpen && (
        <AlarmSetupModal
          isOpen={true}
          onClose={() => setAlarmModal(null)}
          onSave={(t, days, tag, l, o) => {
            handleSaveAlarm(t, days, tag, l, o);
            setAlarmModal(null);
          }}
          initialTimeStr={alarmModal.initialTimeStr}
        />
      )}

      {fileUploadModal?.isOpen && (
        <FileUploadModal
          isOpen={true}
          onClose={() => setFileUploadModal(null)}
          onUploadComplete={(file) => {
            if (editor && file) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: {
                  fileId: file.id,
                  name: file.name,
                  fileType: file.file_type || 'other',
                  isLink: fileUploadModal.isLink || false
                }
              }).run();
            }
            setFileUploadModal(null);
          }}
          onUploaded={(fileId, fileName, fileType) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: {
                  fileId,
                  name: fileName,
                  fileType,
                  isLink: fileUploadModal.isLink || false
                }
              }).run();
            }
            setFileUploadModal(null);
          }}
          isLink={fileUploadModal.isLink}
        />
      )}

      {fileSelectModal && (
        <FileSelectModal
          isOpen={true}
          onClose={() => setFileSelectModal(false)}
          onSelect={(item) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: { fileId: item.id, name: item.name, fileType: item.type, isLink: true }
              }).run();
            }
            setFileSelectModal(false);
          }}
        />
      )}

      {calendarEventModal?.isOpen && (
        <CalendarEventModal
          isOpen={true}
          onClose={() => setCalendarEventModal(null)}
          onSave={(eventId, title, dateStr, linkedPageId) => {
            if (editor) {
              editor.chain().focus().insertCalendarEventWidget({
                eventId,
                title,
                dateStr,
                pageId: linkedPageId,
                status: 'pending'
              }).run();
            }
            setCalendarEventModal(null);
          }}
          initialTitle={calendarEventModal.initialTitle}
          pageId={pageId}
          pageTitle={currentPage?.title || ''}
        />
      )}

      {mediaSelectModal?.isOpen && (
        <MediaSelectModal
          isOpen={true}
          type={mediaSelectModal.type}
          onClose={() => setMediaSelectModal(null)}
          onSelect={(item) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'mediaWidget',
                attrs: { mediaId: item.id, mediaType: mediaSelectModal.type, title: item.title }
              }).run();
            }
            setMediaSelectModal(null);
          }}
        />
      )}

      {mediaActionModal?.isOpen && (
        <MediaActionModal 
          isOpen={true} 
          mediaId={mediaActionModal.mediaId} 
          mediaType={mediaActionModal.mediaType} 
          title={mediaActionModal.title}
          onClose={() => setMediaActionModal(null)}
        />
      )}

      {fileActionModal?.isOpen && (
        <FileActionModal
          isOpen={true}
          fileId={fileActionModal.fileId}
          title={fileActionModal.title}
          onClose={() => setFileActionModal(null)}
          onOpenViewer={() => {
            window.dispatchEvent(new CustomEvent('open-quick-viewer', {
              detail: { fileId: fileActionModal.fileId }
            }));
          }}
        />
      )}

      <ImageDeleteModal
        isOpen={!!imageToDelete}
        onClose={() => setImageToDelete(null)}
        onConfirm={() => {
          if (imageToDelete && editor) {
            deleteImageAt(editor, imageToDelete.node, imageToDelete.pos);
            editor.commands.focus();
          }
          setImageToDelete(null);
        }}
      />
    </div>
  );
}
