import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { useFocusContext } from '../../store/FocusContext';
import { XSquare } from 'lucide-react';
import { Portal } from '../ui/Portal';

export default function AlarmWidgetNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const { alarmId, timeStr, label, status } = node.attrs;
  const { alarms, handleToggleAlarm } = useFocusContext();

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

  // Auto-complete status if global alarm is no longer active or exists
  useEffect(() => {
    if (status === 'pending') {
      const activeAlarm = alarms.find((a: any) => a.id === alarmId && a.is_active);
      if (!activeAlarm && alarms.some((a: any) => a.id === alarmId)) {
        // Alarme disparou e ficou inativo
        updateAttributes({ status: 'triggered' });
        setShowPopover(false);
      }
    }
  }, [status, alarms, alarmId, updateAttributes]);

  const isPending = status === 'pending';

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
    if (isPending) {
      setShowPopover(!showPopover);
    }
  };

  const onCancel = async () => {
    if (alarmId) {
      await handleToggleAlarm(alarmId, false);
    }
    updateAttributes({ status: 'cancelled' });
    setShowPopover(false);
  };

  return (
    <NodeViewWrapper as="span" className="inline-block relative mx-1">
      <span 
        ref={containerRef}
        contentEditable={false}
        onClick={togglePopover}
        onMouseDown={() => {
          if (typeof getPos === 'function' && editor) {
            const pos = getPos();
            if (typeof pos === 'number') {
              editor.commands.setNodeSelection(pos);
            }
          }
        }}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium cursor-pointer transition-colors border select-all ${
          status === 'triggered' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : status === 'cancelled'
            ? 'bg-red-500/10 text-red-400 border-red-500/20'
            : 'bg-brand-500/10 text-brand-300 border-brand-500/20 hover:bg-brand-500/20'
        }`}
      >
        <span>
          {status === 'triggered' ? '✅' : status === 'cancelled' ? '❌' : '🔔'}
        </span>
        <span className="max-w-[200px] truncate">
          Alarme{label ? `: ${label}` : ''}
        </span>
        <span className="opacity-50">-</span>
        <span className="font-mono">{timeStr}</span>
      </span>

      {showPopover && isPending && (
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
              onClick={onCancel}
              className="p-1.5 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-1"
              title="Cancelar Alarme"
            >
              <XSquare size={16} /> <span className="text-xs">Cancelar</span>
            </button>
          </div>
        </Portal>
      )}
    </NodeViewWrapper>
  );
}
