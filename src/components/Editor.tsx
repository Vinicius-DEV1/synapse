import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor as TipTapEditor } from '@tiptap/react';
import { getSettings } from '../utils/settings';
import { EditorBubbleMenus } from './editor/components/EditorBubbleMenus';
import { useFocusContext } from '../store/FocusContext';
import { getNotesKey } from '../store/useStore';

import { useEditorSync } from './editor/hooks/useEditorSync';
import { useEditorSave } from './editor/hooks/useEditorSave';
import { useSlashCommand } from './editor/hooks/useSlashCommand';
import { useEditorExtensions } from './editor/hooks/useEditorExtensions';
import { useEditorModals } from './editor/hooks/useEditorModals';
import { useEditorDropPaste } from './editor/hooks/useEditorDropPaste';
import { useBlockHandle } from './editor/hooks/useBlockHandle';
import BlockHandle from './editor/components/BlockHandle';
import EditorModalHost from './editor/components/EditorModalHost';
import TableExcelGrips from './editor/components/table/TableExcelGrips';

interface EditorProps {
  pageId: string | null;
  pageTitle?: string;
  initialContent: string;
  initialCrdtState?: string | null;
  onSave: (
    content: string,
    crdtState: string | null,
    embeddedSaves?: { id: string; content: string }[],
    senderInstanceId?: string
  ) => void;
  onCreateLinkedPage?: (title: string) => Promise<string | null>;
  isActive?: boolean;
}

function EditorBlockHandleHost({
  editor,
  wrapperRef,
}: {
  editor: TipTapEditor | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const blockHandle = useBlockHandle(editor, wrapperRef);
  if (!blockHandle.anchor) return null;

  return (
    <BlockHandle
      x={blockHandle.anchor.x}
      y={blockHandle.anchor.y}
      onDragStart={blockHandle.onDragStart}
      onDragEnd={blockHandle.onDragEnd}
      onDelete={blockHandle.onDelete}
      onMoveUp={blockHandle.onMoveUp}
      onMoveDown={blockHandle.onMoveDown}
      onAddBelow={blockHandle.onAddBelow}
      onMenuOpenChange={blockHandle.onMenuOpenChange}
      onChangeColor={blockHandle.onChangeColor}
    />
  );
}

export default function Editor({
  pageId,
  pageTitle,
  initialContent,
  initialCrdtState,
  onSave,
  onCreateLinkedPage,
  isActive = true,
}: EditorProps) {
  const [settings, setSettings] = useState(getSettings());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const instanceId = useRef('ed_inst_' + Math.random().toString(36).substring(2, 9)).current;

  const masterKey = getNotesKey();
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
  const { ydocRef, crdtFailed } = useEditorSync({
    pageId,
    initialCrdtState,
    onSaveRef,
    latestContentRef,
    instanceId,
  });

  // When CRDT is corrupted, treat the page as having no CRDT so HTML content is used
  const effectiveCrdtState = crdtFailed ? null : initialCrdtState;

  // 2. Extensions
  const extensions = useEditorExtensions(ydocRef.current);

  // 3. Save Logic
  const { handleUpdate, cleanupSave } = useEditorSave({
    pageId,
    ydocRef,
    onSaveRef,
    latestContentRef,
    instanceId,
  });

  useEffect(() => {
    return () => {
      cleanupSave();
    };
  }, [pageId, cleanupSave]);

  // 4. Drop & Paste Handlers & Modais
  const editorRef = useRef<TipTapEditor | null>(null);
  const modals = useEditorModals({ editorRef, isActive });

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
    setQuestionCreateModal: modals.setQuestionCreateModal,
  });

  const { handlePaste, handleDrop, handleCroppedImage } = useEditorDropPaste({
    editorRef,
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
      handleClick: (view, _pos, event) => {
        const targetElement = event.target as HTMLElement;
        const spoiler = targetElement.closest('.caderno-spoiler, [data-type="spoiler"]');
        if (spoiler) {
          if (event.altKey) {
            spoiler.classList.toggle('is-revealed');
            return true;
          } else if (!spoiler.classList.contains('is-revealed')) {
            spoiler.classList.add('is-revealed');
            return true;
          }
        }

        if (event.target && (event.target as HTMLElement).tagName === 'MARK') {
          const target = event.target as HTMLElement;
          const targetPos = view.posAtDOM(target, 0);
          const node = view.state.doc.nodeAt(targetPos);
          if (node) {
            editor?.commands.setTextSelection({ from: targetPos, to: targetPos + node.nodeSize });
            return true;
          }
        }
        const link = targetElement.closest('a');
        if (link && link.href) {
          const href = link.href.trim();
          if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
            window.open(href, '_blank', 'noopener,noreferrer');
            return true;
          }
        }
        return false;
      },
      handleDoubleClick: (_view, _pos, event) => {
        const targetElement = event.target as HTMLElement;
        const spoiler = targetElement.closest('.caderno-spoiler, [data-type="spoiler"]');
        if (spoiler && spoiler.classList.contains('is-revealed')) {
          spoiler.classList.remove('is-revealed');
          return true;
        }
        return false;
      },
      handlePaste: (view, event, _slice) => handlePaste(view, event),
      handleDrop: (view, event, slice, moved) => handleDrop(view, event, slice, moved),
      handleKeyDown: (view, event) => handleSlashKeyDown(view, event),
    },
    onUpdate: (props) => {
      handleUpdate(props);
      updateSlashMenuOnUpdate(props.editor);
    },
    onCreate: ({ editor: currentEditor }) => {
      const hasMeaningfulCrdt = !!effectiveCrdtState && effectiveCrdtState.length > 8;
      if (!hasMeaningfulCrdt && typeof initialContent === 'string' && initialContent.trim() !== '' && initialContent !== '<p></p>') {
        try {
          currentEditor.commands.setContent(initialContent);
          hasInitializedContentRef.current = true;
        } catch (err) {
          console.error('[Caderno:Editor] Error setting HTML content in onCreate:', err);
        }
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (slashMenu && editor.state.selection.$head.pos <= slashMenu.startPos) {
        setSlashMenu(null);
      }
    },
  });

  const hasInitializedContentRef = useRef(false);

  useEffect(() => {
    hasInitializedContentRef.current = false;
  }, [pageId]);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && !hasInitializedContentRef.current) {
      const hasMeaningfulCrdt = !!effectiveCrdtState && effectiveCrdtState.length > 8;
      const isEmptyEditor = editor.isEmpty || editor.getHTML() === '<p></p>';
      if (!hasMeaningfulCrdt && isEmptyEditor && typeof initialContent === 'string' && initialContent.trim() !== '' && initialContent !== '<p></p>') {
        try {
          editor.commands.setContent(initialContent);
          hasInitializedContentRef.current = true;
        } catch (err) {
          console.error('[Caderno:Editor] Error setting HTML content in useEffect:', err);
          hasInitializedContentRef.current = true; // avoid infinite loop
        }
      }
    }
  }, [pageId, editor, effectiveCrdtState, initialContent]);

  return (
    <div
      ref={wrapperRef}
      className="editor-wrapper relative"
    >
      <EditorBubbleMenus editor={editor} />

      <div className="editor-container relative z-0">
        <EditorContent editor={editor} />
        <TableExcelGrips editor={editor} wrapperRef={wrapperRef} />
      </div>

      <EditorBlockHandleHost editor={editor} wrapperRef={wrapperRef} />

      <EditorModalHost
        editor={editor}
        pageId={pageId}
        pageTitle={pageTitle || ''}
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
        questionCreateModal={modals.questionCreateModal}
        setQuestionCreateModal={modals.setQuestionCreateModal}
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
