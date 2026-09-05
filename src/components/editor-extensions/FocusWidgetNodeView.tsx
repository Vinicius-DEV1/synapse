import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { NodeViewWrapper } from '@tiptap/react';
import { NodeSelection } from '@tiptap/pm/state';
import type { NodeViewProps } from '@tiptap/core';
import { useFocusContext } from '../../store/FocusContext';
import { Play, Pause, XSquare, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { moveBlockUp, moveBlockDown } from './moveBlockCommands';
import { Portal } from '../ui/Portal';

export default function FocusWidgetNodeView({ node, updateAttributes, editor, getPos, selected }: NodeViewProps) {
  const { sessionId, duration, tag,  status } = node.attrs;

  const pos = typeof getPos === 'function' ? getPos() : null;
  const isNodeSelected = !!(
    selected &&
    editor?.state?.selection instanceof NodeSelection &&
    typeof pos === 'number' &&
    editor.state.selection.from === pos
  );
  const { 
    currentSession, 
    timeLeft, 
    isPaused, 
    setIsPaused, 
    handleAddQuickTime,
    handleTimerCancel
  } = useFocusContext();

  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles, isPositioned } = useFloating({
    elements: {
      reference: containerRef.current,
    },
    placement: 'top',
    middleware: [offset(6), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (containerRef.current) {
      refs.setReference(containerRef.current);
    }
  }, [refs]);

  // Auto-complete status if global session is no longer matching our ID
  // and we are still "running"
  useEffect(() => {
    if (status === 'running') {
      const handleFocusEnded = (e: Event) => {
        const customEvent = e as CustomEvent;
        if (customEvent.detail.id === sessionId) {
          updateAttributes({ status: customEvent.detail.status });
          setShowPopover(false);
        }
      };
      window.addEventListener('caderno-focus-ended', handleFocusEnded);
      
      // Fallback: if currentSession becomes null unexpectedly
      if (!currentSession && status === 'running') {
        // Only hides popover, but completion/cancellation is unknown without event.
        // The event above is more accurate.
      }
      return () => window.removeEventListener('caderno-focus-ended', handleFocusEnded);
    }
  }, [status, currentSession, sessionId, updateAttributes]);

  const isMySessionRunning = status === 'running' && currentSession?.id === sessionId;

  // Format tempo
  const displayTime = isMySessionRunning 
    ? `${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}`
    : `${duration}m`;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        (!containerRef.current || !containerRef.current.contains(target))
      ) {
        setShowPopover(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPopover(false);
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPopover]);

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === 'running') {
      setShowPopover(!showPopover);
    }
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative mx-1" ref={containerRef}>
      <span 
        contentEditable={false}
        onMouseDown={() => {
          if (typeof getPos === 'function' && editor) {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.commands.setNodeSelection(pos);
            }
          }
        }}
        onClick={togglePopover}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer transition-colors border select-all ${
          isNodeSelected ? 'ring-2 ring-brand-400 border-brand-400 ' : ''
        }${
          status === 'completed' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : status === 'cancelled'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-brand-500/10 text-brand-300 border-brand-500/20 hover:bg-brand-500/20'
        }`}
      >
        <span>
          {status === 'completed' ? '✅' : status === 'cancelled' ? '❌' : '⏳'}
        </span>
        <span className="max-w-[200px] truncate">
          Foco{tag ? `: ${tag}` : ''}
        </span>
        <span className="opacity-50">-</span>
        <span className="font-mono">{displayTime}</span>
        <span className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && editor) {
                moveBlockUp(editor.view, pos);
              }
            }}
            className="p-0.5 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Subir bloco (Mover para cima)"
          >
            <ArrowUp size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (typeof pos === 'number' && editor) {
                moveBlockDown(editor.view, pos);
              }
            }}
            className="p-0.5 rounded hover:bg-black/30 hover:text-white text-dark-subtext transition-colors"
            title="Descer bloco (Mover para baixo)"
          >
            <ArrowDown size={11} />
          </button>
        </span>
      </span>

      {showPopover && isMySessionRunning && (
        <Portal>
          <div 
            ref={(node) => {
              refs.setFloating(node);
              (popoverRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }}
            style={{
              ...floatingStyles,
              zIndex: 9999,
              visibility: isPositioned ? 'visible' : 'hidden',
              opacity: isPositioned ? 1 : 0,
              pointerEvents: isPositioned ? 'auto' : 'none',
            }}
            className={`fixed bg-dark-card border border-white/10 rounded-lg shadow-xl p-1.5 flex items-center gap-1 ${
              isPositioned ? 'animate-in fade-in zoom-in-95' : ''
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleAddQuickTime(1)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
              title="+1 minuto"
            >
              <Plus size={14} /> 1m
            </button>
            
            <button
              onClick={() => handleAddQuickTime(5)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-bold text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
              title="+5 minutos"
            >
              <Plus size={14} /> 5m
            </button>
            
            <div className="w-px h-4 bg-white/10 mx-1" />
            
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-md text-brand-400 hover:text-brand-300 hover:bg-brand-500/10 transition-colors"
              title={isPaused ? "Retomar" : "Pausar"}
            >
              {isPaused ? <Play size={16} /> : <Pause size={16} />}
            </button>
            
            <button
              onClick={() => {
                handleTimerCancel();
                setShowPopover(false);
              }}
              className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Cancelar Foco"
            >
              <XSquare size={16} />
            </button>
          </div>
        </Portal>
      )}
    </NodeViewWrapper>
  );
}

