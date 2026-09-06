import { useState, useEffect, useRef } from 'react';
import type { Node as PMNode } from '@tiptap/pm/model';

export interface UseEditorModalsOptions {
  editorRef?: React.RefObject<any>;
  isActive?: boolean;
}

export function useEditorModals(options?: UseEditorModalsOptions) {
  const editorRef = options?.editorRef;
  const isActive = options?.isActive ?? true;
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const [viewerState, setViewerState] = useState<{
    isOpen: boolean;
    src: string;
    nodePos: number | null;
    nodeType: string | null;
  }>({ isOpen: false, src: '', nodePos: null, nodeType: null });

  const [focusModal, setFocusModal] = useState<{
    isOpen: boolean;
    initialTime?: number;
    initialTag?: string;
    initialDesc?: string;
  } | null>(null);

  const [alarmModal, setAlarmModal] = useState<{
    isOpen: boolean;
    initialTimeStr?: string;
  } | null>(null);

  const [fileUploadModal, setFileUploadModal] = useState<{
    isOpen: boolean;
    isLink: boolean;
    initialFiles?: File[];
  } | null>(null);

  const [fileSelectModal, setFileSelectModal] = useState(false);

  const [pageSearchMenu, setPageSearchMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    query: string;
    mode?: 'link' | 'create';
  } | null>(null);

  const [calendarEventModal, setCalendarEventModal] = useState<{
    isOpen: boolean;
    initialTitle?: string;
  } | null>(null);

  const [mediaSelectModal, setMediaSelectModal] = useState<{
    isOpen: boolean;
    type: 'video' | 'book';
  } | null>(null);

  const [mediaActionModal, setMediaActionModal] = useState<{
    isOpen: boolean;
    mediaId: string;
    mediaType: 'video' | 'book';
    title: string;
  } | null>(null);

  const [fileActionModal, setFileActionModal] = useState<{
    isOpen: boolean;
    fileId: string;
    title: string;
  } | null>(null);

  const [imageToDelete, setImageToDelete] = useState<{
    node: PMNode;
    pos: number | null;
  } | null>(null);

  useEffect(() => {
    const handleOpenImageViewer = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.src) {
        if (editorRef?.current && detail.editor && detail.editor !== editorRef.current) {
          return;
        }
        setViewerState({
          isOpen: true,
          src: detail.src,
          nodePos: typeof detail.nodePos === 'number' ? detail.nodePos : null,
          nodeType: detail.nodeType || null,
        });
      }
    };

    const handleOpenMediaAction = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.mediaId) {
        if (editorRef?.current && detail.editor && detail.editor !== editorRef.current) {
          return;
        }
        setMediaActionModal({
          isOpen: true,
          mediaId: detail.mediaId,
          mediaType: detail.mediaType,
          title: detail.title || '',
        });
      }
    };

    const handleOpenFileAction = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.fileId) {
        if (editorRef?.current && detail.editor && detail.editor !== editorRef.current) {
          return;
        }
        setFileActionModal({
          isOpen: true,
          fileId: detail.fileId,
          title: detail.title || '',
        });
      }
    };

    const handleRequestImageDelete = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.node) {
        if (editorRef?.current && detail.editor && detail.editor !== editorRef.current) {
          return;
        }
        setImageToDelete({
          node: detail.node,
          pos: typeof detail.pos === 'number' ? detail.pos : null,
        });
      }
    };

    const handleDropFiles = (e: Event) => {
      if (!isActiveRef.current) return;
      const detail = (e as CustomEvent).detail;
      if (detail && detail.files && detail.files.length > 0) {
        setFileUploadModal({
          isOpen: true,
          isLink: false,
          initialFiles: detail.files
        });
      }
    };

    const handleCloseTransientModals = () => {
      setFileActionModal(null);
      setMediaActionModal(null);
      setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null });
      setImageToDelete(null);
      setPageSearchMenu(null);
      setMediaSelectModal(null);
      setFileSelectModal(false);
      setFileUploadModal(null);
      setCalendarEventModal(null);
      setFocusModal(null);
      setAlarmModal(null);
    };

    window.addEventListener('open-image-viewer', handleOpenImageViewer);
    window.addEventListener('open-media-action', handleOpenMediaAction);
    window.addEventListener('open-file-action', handleOpenFileAction);
    window.addEventListener('request-image-delete', handleRequestImageDelete);
    window.addEventListener('caderno-drop-files', handleDropFiles);
    window.addEventListener('caderno-flush-editor', handleCloseTransientModals);

    return () => {
      window.removeEventListener('open-image-viewer', handleOpenImageViewer);
      window.removeEventListener('open-media-action', handleOpenMediaAction);
      window.removeEventListener('open-file-action', handleOpenFileAction);
      window.removeEventListener('request-image-delete', handleRequestImageDelete);
      window.removeEventListener('caderno-drop-files', handleDropFiles);
      window.removeEventListener('caderno-flush-editor', handleCloseTransientModals);
    };
  }, []);

  return {
    viewerState,
    setViewerState,
    focusModal,
    setFocusModal,
    alarmModal,
    setAlarmModal,
    fileUploadModal,
    setFileUploadModal,
    fileSelectModal,
    setFileSelectModal,
    pageSearchMenu,
    setPageSearchMenu,
    calendarEventModal,
    setCalendarEventModal,
    mediaSelectModal,
    setMediaSelectModal,
    mediaActionModal,
    setMediaActionModal,
    fileActionModal,
    setFileActionModal,
    imageToDelete,
    setImageToDelete,
  };
}
