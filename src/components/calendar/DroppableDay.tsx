import React, { memo } from 'react';
import { format, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';

export interface DroppableDayProps {
  date: Date;
  isCurrentMonth: boolean;
  children: React.ReactNode;
  onClick: () => void;
  todayRef?: React.Ref<HTMLDivElement>;
}

export const DroppableDay = memo(function DroppableDay({
  date,
  isCurrentMonth,
  children,
  onClick,
  todayRef,
}: DroppableDayProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
    data: { date },
  });

  const combineRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (todayRef) {
      if (typeof todayRef === 'function') {
        todayRef(node);
      } else if ('current' in todayRef) {
        (todayRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    }
  };

  return (
    <div
      ref={combineRefs}
      onClick={onClick}
      className={`min-h-[85px] border-r border-b border-dark-border p-1.5 transition-colors cursor-pointer relative ${
        !isCurrentMonth
          ? 'bg-dark-bg/40'
          : isToday(date)
          ? 'bg-emerald-500/[0.04] border-emerald-500/30'
          : 'bg-transparent'
      } ${isOver ? 'bg-dark-hover/50' : 'hover:bg-dark-hover/30'}`}
    >
      <div
        className={`text-xs p-1 mb-1 font-medium w-6 h-6 flex items-center justify-center rounded-full ${
          isToday(date)
            ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/50'
            : 'text-dark-subtext'
        }`}
      >
        {format(date, 'd')}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
});
