import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { CalendarEvent } from '../../types';

interface DraggableEventProps {
  event: CalendarEvent;
  onClick: () => void;
}

export const DraggableEvent = memo(function DraggableEvent({
  event,
  onClick,
}: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: event,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: event.color || '#4F46E5' }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`text-xs px-1.5 py-1 mb-1 rounded text-white truncate cursor-pointer shadow-sm ${
        event.status === 'completed'
          ? 'opacity-50 line-through'
          : 'opacity-90 hover:opacity-100'
      }`}
    >
      {event.type === 'task' ? '✓ ' : ''}
      {event.title}
    </div>
  );
});
