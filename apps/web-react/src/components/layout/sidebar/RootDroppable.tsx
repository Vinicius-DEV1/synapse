import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface RootDroppableProps {
  children: React.ReactNode;
}

export function RootDroppable({ children }: RootDroppableProps) {
  const { setNodeRef } = useDroppable({
    id: 'root',
    data: { type: 'hierarchy-root' },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 overflow-y-auto px-2 py-1 pb-20"
      id="sidebar-page-tree"
    >
      {children}
    </div>
  );
}
