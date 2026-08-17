import React from 'react';
import type { Editor } from '@tiptap/core';
import SlashMenu from '../../SlashMenu';
import PageSearchMenu from '../../PageSearchMenu';
import ImageViewerModal from '../../ImageViewerModal';
import SetupModal from '../../focus/SetupModal';
import AlarmSetupModal from '../../focus/AlarmSetupModal';
import FileUploadModal from '../../files/FileUploadModal';
import FileSelectModal from '../../files/FileSelectModal';
import CalendarEventModal from '../../editor-extensions/CalendarEventModal';
import MediaSelectModal from '../../MediaSelectModal';
import MediaActionModal from '../../MediaActionModal';
import FileActionModal from '../../FileActionModal';
import ImageDeleteModal from '../../ImageDeleteModal';
import { deleteImageAt } from '../../editor-extensions/image/imageUtils';
import type { SlashMenuState } from '../hooks/useSlashCommand';
import type { Alarm } from '../../focus/types';

interface EditorModalHostProps {
  editor: Editor | null;
  pageId: string | null;
  pageTitle: string;
  slashMenu: SlashMenuState | null;
  setSlashMenu: React.Dispatch<React.SetStateAction<SlashMenuState | null>>;
  executeSlashCommand: (commandId: string, editor: Editor | null) => void;
  pageSearchMenu: { isOpen: boolean; x: number; y: number; query: string } | null;
  setPageSearchMenu: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; x: number; y: number; query: string } | null>
  >;
  onCreateLinkedPage?: (title: string) => Promise<string>;
  viewerState: {
    isOpen: boolean;
    src: string;
    nodePos: number | null;
    nodeType: string | null;
  };
  setViewerState: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      src: string;
      nodePos: number | null;
      nodeType: string | null;
    }>
  >;
  handleCroppedImage: (croppedDataUrl: string) => Promise<void>;
  focusModal: {
    isOpen: boolean;
    initialTime?: number;
    initialTag?: string;
    initialDesc?: string;
  } | null;
  setFocusModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      initialTime?: number;
      initialTag?: string;
      initialDesc?: string;
    } | null>
  >;
  // Mesma assinatura de `useFocusContext().handleStartTimer` — a interface
  // antiga (`time, tag?, desc?`) nunca bateu com o real
  // `(tag, description, targetTime, explicitId?)`, e com `isOpen`/`onClose`/
  // `initialTime`/`initialDesc` como props fantasma o botão de fechar do
  // SetupModal (que espera `onCancel`) nunca foi ligado a nada.
  handleStartTimer: (
    tag: string,
    description: string,
    targetTime: number,
    explicitId?: string
  ) => string | void;
  alarmModal: { isOpen: boolean; initialTimeStr?: string } | null;
  setAlarmModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; initialTimeStr?: string } | null>
  >;
  // Mesma assinatura de `useFocusContext().handleSaveAlarm` — o AlarmSetupModal
  // real recebe um único objeto `Alarm`, não 5 parâmetros posicionais.
  handleSaveAlarm: (alarm: Alarm) => Promise<void>;
  fileUploadModal: { isOpen: boolean; isLink: boolean } | null;
  setFileUploadModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; isLink: boolean } | null>
  >;
  fileSelectModal: boolean;
  setFileSelectModal: React.Dispatch<React.SetStateAction<boolean>>;
  calendarEventModal: { isOpen: boolean; initialTitle?: string } | null;
  setCalendarEventModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; initialTitle?: string } | null>
  >;
  mediaSelectModal: { isOpen: boolean; type: 'video' | 'book' } | null;
  setMediaSelectModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; type: 'video' | 'book' } | null>
  >;
  mediaActionModal: {
    isOpen: boolean;
    mediaId: string;
    mediaType: 'video' | 'book';
    title: string;
  } | null;
  setMediaActionModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      mediaId: string;
      mediaType: 'video' | 'book';
      title: string;
    } | null>
  >;
  fileActionModal: { isOpen: boolean; fileId: string; title: string } | null;
  setFileActionModal: React.Dispatch<
    React.SetStateAction<{ isOpen: boolean; fileId: string; title: string } | null>
  >;
  imageToDelete: { node: any; pos: number | null } | null;
  setImageToDelete: React.Dispatch<React.SetStateAction<{ node: any; pos: number | null } | null>>;
}

export default function EditorModalHost({
  editor,
  pageId,
  pageTitle,
  slashMenu,
  setSlashMenu,
  executeSlashCommand,
  pageSearchMenu,
  setPageSearchMenu,
  onCreateLinkedPage,
  viewerState,
  setViewerState,
  handleCroppedImage,
  focusModal,
  setFocusModal,
  handleStartTimer,
  alarmModal,
  setAlarmModal,
  handleSaveAlarm,
  fileUploadModal,
  setFileUploadModal,
  fileSelectModal,
  setFileSelectModal,
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
}: EditorModalHostProps) {
  return (
    <>
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
              const startPos = slashMenu
                ? slashMenu.startPos
                : editor.state.selection.$head.pos - pageSearchMenu.query.length - 1;
              const endPos = editor.state.selection.$head.pos;

              editor.commands.deleteRange({ from: startPos, to: endPos });
              editor.chain().focus().insertContent({
                type: 'pageReference',
                attrs: { pageId: finalId, title: title },
              }).run();
            }
            setPageSearchMenu(null);
            setSlashMenu(null);
          }}
        />
      )}

      <ImageViewerModal
        isOpen={viewerState.isOpen}
        imageSrc={viewerState.src}
        onClose={() => setViewerState({ isOpen: false, src: '', nodePos: null, nodeType: null })}
        onSave={handleCroppedImage}
      />

      {focusModal?.isOpen && (
        <SetupModal
          onCancel={() => setFocusModal(null)}
          onStart={(tag, description, targetTime) => {
            handleStartTimer(tag, description, targetTime);
            setFocusModal(null);
          }}
          initialTag={focusModal.initialTag}
          initialDescription={focusModal.initialDesc}
          initialTargetTime={focusModal.initialTime}
        />
      )}

      {alarmModal?.isOpen && (
        <AlarmSetupModal
          onCancel={() => setAlarmModal(null)}
          onSave={(alarm) => {
            handleSaveAlarm(alarm);
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
                  isLink: fileUploadModal.isLink || false,
                },
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
                  isLink: fileUploadModal.isLink || false,
                },
              }).run();
            }
            setFileUploadModal(null);
          }}
          isLink={fileUploadModal.isLink}
        />
      )}

      {fileSelectModal && (
        <FileSelectModal
          onClose={() => setFileSelectModal(false)}
          onSelect={(item) => {
            if (editor) {
              editor.chain().focus().insertContent({
                type: 'fileWidget',
                attrs: { fileId: item.id, name: item.name, fileType: item.type, isLink: true },
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
                status: 'pending',
              }).run();
            }
            setCalendarEventModal(null);
          }}
          initialTitle={calendarEventModal.initialTitle}
          pageId={pageId}
          pageTitle={pageTitle}
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
                attrs: { mediaId: item.id, mediaType: mediaSelectModal.type, title: item.title },
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
            window.dispatchEvent(
              new CustomEvent('open-quick-viewer', {
                detail: { fileId: fileActionModal.fileId },
              })
            );
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
    </>
  );
}
