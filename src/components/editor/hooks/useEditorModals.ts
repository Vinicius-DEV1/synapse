import { useState, useEffect } from 'react';
import type { Node as PMNode } from '@tiptap/pm/model';

export function useEditorModals() {
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

    const handleOpenMediaAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setMediaActionModal({
        isOpen: true,
        mediaId: detail.mediaId,
        mediaType: detail.mediaType,
        title: detail.title,
      });
    };

    const handleOpenFileAction = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setFileActionModal({
        isOpen: true,
        fileId: detail.fileId,
        title: detail.title,
      });
    };

    const handleRequestImageDelete = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.node) {
        setImageToDelete({
          node: detail.node,
          pos: typeof detail.pos === 'number' ? detail.pos : null,
        });
      }
    };

    window.addEventListener('open-image-viewer', handleOpenImageViewer);
    window.addEventListener('open-media-action', handleOpenMediaAction);
    window.addEventListener('open-file-action', handleOpenFileAction);
    window.addEventListener('request-image-delete', handleRequestImageDelete);

    return () => {
      window.removeEventListener('open-image-viewer', handleOpenImageViewer);
      window.removeEventListener('open-media-action', handleOpenMediaAction);
      window.removeEventListener('open-file-action', handleOpenFileAction);
      window.removeEventListener('request-image-delete', handleRequestImageDelete);
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
