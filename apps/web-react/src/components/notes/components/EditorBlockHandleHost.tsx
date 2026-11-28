import React from 'react';
import { createPortal } from 'react-dom';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useBlockHandle } from '../hooks/useBlockHandle';
import BlockHandle from './BlockHandle';

export interface EditorBlockHandleHostProps {
  editor: TipTapEditor | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  isActive?: boolean;
}

export function EditorBlockHandleHost({
  editor,
  wrapperRef,
  isActive = true,
}: EditorBlockHandleHostProps) {
  const blockHandle = useBlockHandle(editor, wrapperRef, isActive);
  if (!blockHandle.anchor) return null;

  const handle = (
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

  // Portal to document.body so ancestor transforms (e.g. .smooth-scroll-container)
  // do not shift position: fixed viewport coordinates.
  return typeof document !== 'undefined' ? createPortal(handle, document.body) : handle;
}

export default EditorBlockHandleHost;
