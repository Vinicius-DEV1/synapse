import { useCallback, useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { ChevronLeft, ChevronRight, Columns2, Plus, Ungroup, X } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import type { GroupSpec } from './groupSpecs';
import { appendToGroup, balanceChildren, moveChild, removeChild, unwrapGroup } from './groupCommands';
import { useGroupResize } from './useGroupResize';

interface GroupShellProps {
  spec: GroupSpec;
  node: PMNode;
  editor: Editor;
  getPos: unknown;
  className?: string;
}

/**
 * Structural NodeView component for layout grouping (columns, card groups).
 * Fornece divisores de redimensionamento interativos, barra de ferramentas de controle e balanceamento.
 */
export default function GroupShell({
  spec,
  node,
  editor,
  getPos,
  className = '',
}: GroupShellProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const resolvePos = useCallback((): number | undefined => {
    if (typeof getPos !== 'function') return undefined;
    const pos = (getPos as () => number | undefined)();
    return typeof pos === 'number' ? pos : undefined;
  }, [getPos]);

  const { handleOffsets, wrapperWidth, isResizing, previewWidths, startResize } = useGroupResize({
    spec,
    node,
    view: editor.view,
    getPos: resolvePos,
    wrapperRef,
    enabled: editor.isEditable,
  });

  const runOnGroup = useCallback(
    (action: (view: EditorView, pos: number) => void) => {
      const pos = resolvePos();
      if (pos === undefined) return;
      action(editor.view, pos);
    },
    [editor, resolvePos]
  );

  const handleAddColumn = useCallback(() => {
    runOnGroup((view, pos) => {
      const paragraphType = view.state.schema.nodes.paragraph;
      const emptyParagraph = paragraphType ? paragraphType.create() : null;
      if (emptyParagraph) {
        appendToGroup(view, pos, [emptyParagraph], 'right');
      }
    });
  }, [runOnGroup]);

  const handleBalance = useCallback(
    () => runOnGroup((view, pos) => balanceChildren(view, pos)),
    [runOnGroup]
  );

  const handleUnwrap = useCallback(
    () => runOnGroup((view, pos) => unwrapGroup(view, pos)),
    [runOnGroup]
  );

  const handleRemoveChild = useCallback(
    (index: number) => runOnGroup((view, pos) => removeChild(view, pos, index)),
    [runOnGroup]
  );

  const handleMoveChild = useCallback(
    (from: number, to: number) => runOnGroup((view, pos) => moveChild(view, pos, from, to)),
    [runOnGroup]
  );

  const showChrome = editor.isEditable && (hovered || isResizing);
  const childCount = node.childCount;

  return (
    <NodeViewWrapper
      ref={wrapperRef}
      as="div"
      data-group-root
      data-group-type={spec.groupName}
      className={`group-layout relative w-full my-4 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showChrome && (
        <div
          contentEditable={false}
          className="group-layout__toolbar absolute -top-3 right-0 z-30 flex items-center gap-0.5 rounded-lg border border-white/10 bg-dark-bg/95 p-1 shadow-2xl backdrop-blur-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
          {childCount < spec.maxChildren && spec.groupName === 'columnGroup' && (
            <ToolbarButton title="Adicionar coluna (+)" onClick={handleAddColumn}>
              <Plus size={14} />
            </ToolbarButton>
          )}
          {spec.resizable && (
            <ToolbarButton title={spec.labels.balance} onClick={handleBalance}>
              <Columns2 size={14} />
            </ToolbarButton>
          )}
          <ToolbarButton title={spec.labels.unwrap} onClick={handleUnwrap}>
            <Ungroup size={14} />
          </ToolbarButton>
        </div>
      )}

      {childCount > 1 &&
        handleOffsets.map((offset, index) => (
          <div
            key={index}
            contentEditable={false}
            className={`group-layout__gutter absolute top-0 bottom-0 z-20 flex w-4 -translate-x-1/2 justify-center ${
              spec.resizable && editor.isEditable ? 'cursor-col-resize' : 'pointer-events-none'
            }`}
            style={{ left: `${offset}px` }}
            onPointerDown={spec.resizable ? (event) => startResize(event, index) : undefined}
          >
            <span className="group-layout__divider" />
          </div>
        ))}

      {showChrome &&
        !isResizing &&
        childCount > 1 &&
        handleOffsets.length > 0 &&
        Array.from({ length: childCount }, (_, index) => (
          <ChildControls
            key={index}
            removeTitle={spec.labels.removeChild}
            index={index}
            childCount={childCount}
            handleOffsets={handleOffsets}
            wrapperWidth={wrapperWidth}
            onRemove={handleRemoveChild}
            onMove={handleMoveChild}
          />
        ))}

      {isResizing && previewWidths && (
        <div
          contentEditable={false}
          className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 rounded-md bg-dark-bg/95 px-2 py-1 font-mono text-[11px] text-white shadow-lg backdrop-blur-xl"
        >
          {previewWidths.map((width) => `${Math.round(width)}%`).join(' · ')}
        </div>
      )}

      <NodeViewContent className="group-layout__content" />
    </NodeViewWrapper>
  );
}

function ChildControls({
  removeTitle,
  index,
  childCount,
  handleOffsets,
  wrapperWidth,
  onRemove,
  onMove,
}: {
  removeTitle: string;
  index: number;
  childCount: number;
  handleOffsets: number[];
  wrapperWidth: number;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
}) {
  const start = index === 0 ? 0 : handleOffsets[index - 1];
  const end = index === childCount - 1 ? wrapperWidth : handleOffsets[index];
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return (
    <div
      contentEditable={false}
      className="group-layout__remove absolute -top-2 z-30 flex items-center gap-0.5 rounded-full border border-white/10 bg-dark-bg/95 px-0.5 shadow-lg backdrop-blur-xl"
      style={{ left: `${(start + end) / 2}px`, transform: 'translateX(-50%)' }}
    >
      <ChildButton
        title="Mover esta coluna para a esquerda"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <ChevronLeft size={11} />
      </ChildButton>

      <ChildButton title={removeTitle} danger onClick={() => onRemove(index)}>
        <X size={11} />
      </ChildButton>

      <ChildButton
        title="Mover esta coluna para a direita"
        disabled={index === childCount - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <ChevronRight size={11} />
      </ChildButton>
    </div>
  );
}

function ChildButton({
  title,
  onClick,
  children,
  disabled = false,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      contentEditable={false}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-full text-dark-subtext transition-colors disabled:opacity-25 ${
        danger ? 'hover:text-red-400' : 'hover:text-brand-300'
      } disabled:hover:text-dark-subtext`}
    >
      {children}
    </button>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      className="rounded p-1.5 text-dark-subtext transition-colors hover:bg-white/10 hover:text-brand-300"
    >
      {children}
    </button>
  );
}
