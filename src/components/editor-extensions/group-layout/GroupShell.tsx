/**
 * GroupShell.tsx
 *
 * Node view compartilhado por todos os grupos lado a lado.
 * Cuida do wrapper, dos divisores visuais, das alças de redimensionamento, da
 * barra de ações e dos botões de remover coluna. Os node views concretos
 * (`ColumnGroup`, `LinkGroupBlock`) viram invólucros de poucas linhas.
 */

import { useCallback, useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { Columns2, Ungroup, X } from 'lucide-react';
import type { GroupSpec } from './groupSpecs';
import { balanceChildren, removeChild, unwrapGroup } from './groupCommands';
import { useGroupResize } from './useGroupResize';

interface GroupShellProps {
  spec: GroupSpec;
  /** Props cruas do node view do Tiptap. */
  node: any;
  editor: any;
  getPos: unknown;
  /** Classe extra no wrapper. */
  className?: string;
}

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

  const { handleOffsets, isResizing, previewWidths, startResize } = useGroupResize({
    spec,
    node,
    view: editor.view,
    getPos: resolvePos,
    wrapperRef,
    enabled: editor.isEditable,
  });

  const runOnGroup = useCallback(
    (action: (view: any, pos: number) => void) => {
      const pos = resolvePos();
      if (pos === undefined) return;
      action(editor.view, pos);
    },
    [editor, resolvePos]
  );

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
      {/* Barra de ações do grupo */}
      {showChrome && (
        <div
          contentEditable={false}
          className="group-layout__toolbar absolute -top-3 right-0 z-30 flex items-center gap-0.5 rounded-lg border border-white/10 bg-dark-bg/95 p-1 shadow-2xl backdrop-blur-xl"
          onMouseDown={(event) => event.preventDefault()}
        >
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

      {/* Divisores + alças de redimensionamento, um por vão */}
      {handleOffsets.map((offset, index) => (
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

      {/* Botão de remover, um por coluna */}
      {showChrome &&
        !isResizing &&
        childCount > 1 &&
        handleOffsets.length > 0 &&
        Array.from({ length: childCount }, (_, index) => (
          <RemoveChildButton
            key={index}
            title={spec.labels.removeChild}
            index={index}
            childCount={childCount}
            handleOffsets={handleOffsets}
            wrapperRef={wrapperRef}
            onRemove={handleRemoveChild}
          />
        ))}

      {/* Badge com as proporções durante o arrasto */}
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

/**
 * O "×" fica no topo de cada coluna. A posição horizontal é derivada dos vãos
 * já medidos, então acompanha o redimensionamento sem medir nada de novo.
 */
function RemoveChildButton({
  title,
  index,
  childCount,
  handleOffsets,
  wrapperRef,
  onRemove,
}: {
  title: string;
  index: number;
  childCount: number;
  handleOffsets: number[];
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onRemove: (index: number) => void;
}) {
  const width = wrapperRef.current?.getBoundingClientRect().width ?? 0;
  const start = index === 0 ? 0 : handleOffsets[index - 1];
  const end = index === childCount - 1 ? width : handleOffsets[index];
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      contentEditable={false}
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove(index);
      }}
      className="group-layout__remove absolute -top-2 z-30 flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-dark-bg/95 text-dark-subtext shadow-lg backdrop-blur-xl transition-colors hover:border-red-500/40 hover:text-red-400"
      style={{ left: `${(start + end) / 2}px`, transform: 'translateX(-50%)' }}
    >
      <X size={11} />
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
