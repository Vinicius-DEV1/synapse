import React from 'react';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useBlockHandle } from '../hooks/useBlockHandle';
import BlockHandle from './BlockHandle';

export interface EditorBlockHandleHostProps {
  editor: TipTapEditor | null;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export function EditorBlockHandleHost({
  editor,
  wrapperRef,
}: EditorBlockHandleHostProps) {
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

export default EditorBlockHandleHost;
