import { useEffect } from 'react';

// Global drag state
const dragState = {
  dragging: false,
  id: null as string | null,
  type: null as string | null,
  ghostEl: null as HTMLDivElement | null,
  startY: 0,
  startX: 0,
};

export interface MouseDragOptions {
  id: string;
  type: string;
  disabled?: boolean;
  getGhostContent?: () => HTMLElement | string;
  onDragStart?: () => void;
  onDrop?: (targetId: string | null) => void;
}

export function useMouseDrag({
  id,
  type,
  disabled,
  getGhostContent,
  onDragStart,
  onDrop
}: MouseDragOptions) {
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    if (e.button !== 0) return; // Only left click
    
    // Don't start drag on buttons or inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;

    const onMouseMove = (moveE: MouseEvent) => {
      const dx = moveE.clientX - startX;
      const dy = moveE.clientY - startY;
      
      // Require minimum movement to start drag (5px)
      if (!hasMoved && Math.abs(dx) + Math.abs(dy) < 5) return;
      
      if (!hasMoved) {
        hasMoved = true;
        dragState.dragging = true;
        dragState.id = id;
        dragState.type = type;
        dragState.startX = startX;
        dragState.startY = startY;

        if (onDragStart) onDragStart();

        // Create ghost element
        const ghost = document.createElement('div');
        ghost.className = 'fixed z-[9999] pointer-events-none opacity-80 scale-105 transition-transform';
        
        if (getGhostContent) {
          const content = getGhostContent();
          if (typeof content === 'string') {
            ghost.innerHTML = content;
          } else {
            ghost.appendChild(content);
          }
        } else {
          // Default ghost
          ghost.className = 'fixed z-[9999] pointer-events-none bg-brand-500/20 backdrop-blur-md border border-brand-500/50 rounded-lg px-3 py-1.5 text-xs text-brand-300 shadow-xl';
          ghost.textContent = 'Movendo...';
        }
        
        ghost.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(ghost);
        dragState.ghostEl = ghost;

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }

      if (dragState.ghostEl) {
        dragState.ghostEl.style.left = `${moveE.clientX}px`;
        dragState.ghostEl.style.top = `${moveE.clientY}px`;
      }

      // Fire custom event for hover detection
      window.dispatchEvent(new CustomEvent('caderno-drag-move', { 
        detail: { x: moveE.clientX, y: moveE.clientY, id, type } 
      }));
    };

    const onMouseUp = (upE: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (hasMoved && dragState.dragging) {
        // Find drop target
        const targetEl = document.elementFromPoint(upE.clientX, upE.clientY);
        let dropTargetId: string | null = null;
        
        if (targetEl) {
           const droppable = targetEl.closest(`[data-droppable-type="${type}"]`);
           if (droppable) {
             dropTargetId = droppable.getAttribute('data-droppable-id');
           }
        }

        // Fire global drop event
        window.dispatchEvent(new CustomEvent('caderno-drag-drop', { 
          detail: { x: upE.clientX, y: upE.clientY, id, type, targetId: dropTargetId } 
        }));

        if (onDrop) {
          onDrop(dropTargetId);
        }

        // Cleanup ghost
        if (dragState.ghostEl) {
          dragState.ghostEl.remove();
          dragState.ghostEl = null;
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        dragState.dragging = false;
        dragState.id = null;
        dragState.type = null;

        // Clear all hover states
        window.dispatchEvent(new CustomEvent('caderno-drag-end'));
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return { handleMouseDown };
}
