import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { getSettings } from '../utils/settings';
import FloatingToolbar from './FloatingToolbar';
import TableToolbar from './TableToolbar';
import { useFocusContext } from '../store/FocusContext';
import { useStore } from '../store/useStore';

import { useEditorSync } from './editor/hooks/useEditorSync';
import { useEditorSave } from './editor/hooks/useEditorSave';
import { useSlashCommand } from './editor/hooks/useSlashCommand';
import { useEditorExtensions } from './editor/hooks/useEditorExtensions';
import { useEditorModals } from './editor/hooks/useEditorModals';
import { useEditorDropPaste } from './editor/hooks/useEditorDropPaste';
import EditorModalHost from './editor/components/EditorModalHost';

interface EditorProps {
  pageId: string | null;
  pageTitle?: string;
  initialContent: string;
  initialCrdtState?: string | null;
  onSave: (
    content: string,
    crdtState: string | null,
    embeddedSaves?: { id: string; content: string }[]
  ) => void;
  onCreateLinkedPage?: (title: string) => Promise<string>;
}

export default function Editor({
  pageId,
  pageTitle,
  initialContent,
  initialCrdtState,
  onSave,
  onCreateLinkedPage,
}: EditorProps) {
  const [settings, setSettings] = useState(getSettings());
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { state } = useStore();
  const currentPage = state.pages.find((p) => p.id === pageId);
  const masterKey = state.moduleKeys?.['notes'];
  const { handleStartTimer, handleSaveAlarm } = useFocusContext();

  const onSaveRef = useRef(onSave);
  const latestContentRef = useRef<{ html: string; crdt: string } | null>(null);

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
    latestContentRef,
  });

  // 2. Extensions
  const extensions = useEditorExtensions(ydocRef.current);

  // 3. Save Logic
  const { handleUpdate, cleanupSave } = useEditorSave({
    pageId,
    ydocRef,
    onSaveRef,
    latestContentRef,
  });

  useEffect(() => {
    return () => {
      cleanupSave();
    };
  }, [pageId, cleanupSave]);

  // 4. Modais
  const modals = useEditorModals();

  // 5. Slash Commands
  const {
    slashMenu,
    setSlashMenu,
    handleSlashKeyDown,
    updateSlashMenuOnUpdate,
    executeSlashCommand,
  } = useSlashCommand({
    setPageSearchMenu: modals.setPageSearchMenu,
    setFocusModal: modals.setFocusModal,
    setAlarmModal: modals.setAlarmModal,
    setFileUploadModal: modals.setFileUploadModal,
    setFileSelectModal: modals.setFileSelectModal,
    setCalendarEventModal: modals.setCalendarEventModal,
    setMediaSelectModal: modals.setMediaSelectModal,
  });

  // 6. Drop & Paste Handlers
  const editorRef = useRef<any>(null);
  const { handlePaste, handleDrop, handleCroppedImage } = useEditorDropPaste({
    editor: editorRef.current,
    masterKey,
    viewerState: modals.viewerState,
    setViewerState: modals.setViewerState,
  });

  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: `editor-content min-h-[300px] leading-relaxed text-dark-text/90 focus:outline-none ${settings.fontSize} ai-highlight-${
          settings.aiChatHighlight || 'glow'
        }`,
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
      handlePaste: (view, event, slice) => handlePaste(view, event),
      handleDrop: (view, event, slice, moved) => handleDrop(view, event, slice, moved),
      handleKeyDown: (view, event) => handleSlashKeyDown(view, event),
    },
    onUpdate: (props) => {
      handleUpdate(props);
      updateSlashMenuOnUpdate(props.editor);
    },
    onSelectionUpdate: ({ editor }) => {
      if (slashMenu && editor.state.selection.$head.pos <= slashMenu.startPos) {
        setSlashMenu(null);
      }
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  return (
    <div
      ref={wrapperRef}
      className={`editor-wrapper relative ${
        settings.zenMode ? 'zen-mode-active max-w-2xl mx-auto py-12' : ''
      }`}
    >
      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 150, placement: 'top' }}
          pluginKey="floatingToolbarBubbleMenu"
          shouldShow={({ editor, view, state, from, to }) => {
            if (from === to) return false;
            if (editor.isActive('table')) return false;
            if (editor.isActive('image') || editor.isActive('encryptedImage') || editor.isActive('resizableImage')) return false;
            return true;
          }}
          className="flex shadow-elevated rounded-xl overflow-hidden border border-white/5 bg-dark-bg/80 backdrop-blur-xl"
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

      <EditorModalHost
        editor={editor}
        pageId={pageId}
        pageTitle={pageTitle || currentPage?.title || ''}
        slashMenu={slashMenu}
        setSlashMenu={setSlashMenu}
        executeSlashCommand={executeSlashCommand}
        pageSearchMenu={modals.pageSearchMenu}
        setPageSearchMenu={modals.setPageSearchMenu}
        onCreateLinkedPage={onCreateLinkedPage}
        viewerState={modals.viewerState}
        setViewerState={modals.setViewerState}
        handleCroppedImage={handleCroppedImage}
        focusModal={modals.focusModal}
        setFocusModal={modals.setFocusModal}
        handleStartTimer={handleStartTimer}
        alarmModal={modals.alarmModal}
        setAlarmModal={modals.setAlarmModal}
        handleSaveAlarm={handleSaveAlarm}
        fileUploadModal={modals.fileUploadModal}
        setFileUploadModal={modals.setFileUploadModal}
        fileSelectModal={modals.fileSelectModal}
        setFileSelectModal={modals.setFileSelectModal}
        calendarEventModal={modals.calendarEventModal}
        setCalendarEventModal={modals.setCalendarEventModal}
        mediaSelectModal={modals.mediaSelectModal}
        setMediaSelectModal={modals.setMediaSelectModal}
        mediaActionModal={modals.mediaActionModal}
        setMediaActionModal={modals.setMediaActionModal}
        fileActionModal={modals.fileActionModal}
        setFileActionModal={modals.setFileActionModal}
        imageToDelete={modals.imageToDelete}
        setImageToDelete={modals.setImageToDelete}
      />
    </div>
  );
}
