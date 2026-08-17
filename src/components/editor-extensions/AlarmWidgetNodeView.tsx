import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { useFocusContext } from '../../store/FocusContext';
import { XSquare } from 'lucide-react';

export default function AlarmWidgetNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
  const { alarmId, timeStr, label, status } = node.attrs;
  const { alarms, handleToggleAlarm } = useFocusContext();

  const [showPopover, setShowPopover] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Auto-complete status se o alarme global não estiver mais ativo ou não existir
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <NodeViewWrapper as="span" className="inline-block relative mx-1" ref={containerRef}>
      <span 
        data-drag-handle
        contentEditable={false}
        onClick={togglePopover}
        onMouseDown={() => {
          if (typeof getPos === 'function') {
            const pos = getPos();
            if (typeof pos === 'number' && editor) {
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
        <div 
          className="absolute z-[9999] bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-card border border-white/10 rounded-lg shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2"
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
      )}
    </NodeViewWrapper>
  );
}
