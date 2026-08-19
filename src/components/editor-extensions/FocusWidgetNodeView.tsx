import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { useFocusContext } from '../../store/FocusContext';
import { Play, Pause, XSquare, Plus } from 'lucide-react';

export default function FocusWidgetNodeView({ node, updateAttributes, editor, getPos, selected }: NodeViewProps) {
  const { sessionId, duration, tag,  status } = node.attrs;
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
      
      // Fallback: se o currentSession mudar para nulo subitamente (por algum reload bizarro)
      if (!currentSession && status === 'running') {
        // Apenas oculta o popover, mas não sabemos se foi cancelado ou completo se não pegamos o evento.
        // O evento acima é mais preciso.
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    if (showPopover) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
          selected ? 'ring-2 ring-brand-400 border-brand-400 ' : ''
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
      </span>

      {showPopover && isMySessionRunning && (
        <div 
          className="absolute z-[9999] bottom-full mb-2 left-1/2 -translate-x-1/2 bg-dark-card border border-white/10 rounded-lg shadow-xl p-1.5 flex items-center gap-1 animate-in fade-in slide-in-from-bottom-2"
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
      )}
    </NodeViewWrapper>
  );
}
