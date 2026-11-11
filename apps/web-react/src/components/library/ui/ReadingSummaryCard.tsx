import React, { type ReactNode } from 'react';

interface ReadingSummaryCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

export const ReadingSummaryCard: React.FC<ReadingSummaryCardProps> = ({
  icon,
  label,
  value,
  color,
  bgColor,
}) => {
  return (
    <div className="bg-dark-bg rounded-xl border border-white/5 p-4 flex flex-col gap-2">
      <div className={`p-2 rounded-lg ${bgColor} w-fit`}>
        <span className={color}>{icon}</span>
      </div>
      <span className="text-xl font-bold text-dark-text">{value}</span>
      <span className="text-[11px] text-dark-subtext">{label}</span>
    </div>
  );
};
