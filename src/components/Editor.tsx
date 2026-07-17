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

import { useEditorSync } from './editor/hooks/useEditorSync';
import { useEditorSave } from './editor/hooks/useEditorSave';
import { useSlashCommand } from './editor/hooks/useSlashCommand';
import { useEditorExtensions } from './editor/hooks/useEditorExtensions';

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
  const [viewerState, setViewerState] = useState<{ isOpen: boolean, src: string, nodePos: number | null }>({ isOpen: false, src: '', nodePos: null });

  // Modals States
  const [focusModal, setFocusModal] = useState<{ isOpen: boolean, initialTime?: number, initialTag?: string, initialDesc?: string } | null>(null);
  const [alarmModal, setAlarmModal] = useState<{ isOpen: boolean, initialTimeStr?: string } | null>(null);
  const [fileUploadModal, setFileUploadModal] = useState<{ isOpen: boolean, isLink: boolean } | null>(null);
  const [fileSelectModal, setFileSelectModal] = useState(false);
  const [pageSearchMenu, setPageSearchMenu] = useState<{ isOpen: boolean, x: number, y: number, query: string } | null>(null);
  
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
  const { ydocRef, needsLegacyHydration } = useEditorSync({
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
    setFileSelectModal
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
                file.arrayBuffer().then(buffer => {
                  setCachedImage(tempId, buffer, file.type).catch(console.error);
                }).catch(console.error);
                editor.chain().focus().insertContent({
                  type: 'encryptedImage',
                  attrs: { driveFileId: tempId }
                }).run();
              } else {
                if (file.size > 2 * 1024 * 1024) {
                  alert('Imagem muito grande para colar sem criptografia (limite 2MB). Reduza o tamanho ou espere a sincronização.');
                  return true;
                }
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
        if (node.type.name === 'image' || node.type.name === 'encryptedImage') {
          const target = event.target as HTMLImageElement;
          const src = target?.src || node.attrs.src;
          if (src) {
            setViewerState({ isOpen: true, src, nodePos });
          }
          return true;
        }
        return false;
      },
      handleKeyDown: handleSlashKeyDown
    },
    onUpdate: (props) => {
      handleUpdate(props);
      updateSlashMenuOnUpdate(props.editor);
    }
  }, [pageId]);

  useEffect(() => {
    if (editor && needsLegacyHydration && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
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
            if (selectedPageId === 'NEW' && onCreateLinkedPage) {
              finalId = await onCreateLinkedPage(title);
            }
            if (finalId && editor) {
              const startPos = slashMenu ? slashMenu.startPos : editor.state.selection.$head.pos - pageSearchMenu.query.length - 1;
              const endPos = editor.state.selection.$head.pos;
              
              editor.commands.deleteRange({ from: startPos, to: endPos });
              editor.chain().focus().insertContent({
                type: 'pageReference',
                attrs: { pageId: finalId, pageTitle: title }
              }).run();
            }
            setPageSearchMenu(null);
            setSlashMenu(null);
          }}
        />
      )}

      {viewerState.isOpen && (
        <ImageViewerModal
          src={viewerState.src}
          onClose={() => setViewerState({ isOpen: false, src: '', nodePos: null })}
          onSaveSize={(width, height) => {
            if (viewerState.nodePos !== null && editor) {
              editor.commands.setNodeSelection(viewerState.nodePos);
              editor.commands.updateAttributes('resizableImage', { width, height });
              editor.commands.updateAttributes('encryptedImage', { width, height });
              editor.commands.updateAttributes('image', { width, height });
            }
          }}
        />
      )}

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
          onUploaded={(fileId, fileName, fileType, isEncrypted) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: { fileId, fileName, fileType, isEncrypted }
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
          onSelect={(fileId, fileName, fileType, isEncrypted) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: { fileId, fileName, fileType, isEncrypted }
              }).run();
            }
            setFileSelectModal(false);
          }}
        />
      )}
    </div>
  );
}
