import React from 'react';
import type { VaultItem } from '../../../types';
import type { AnalyzedItem } from '../hooks/useVaultSecurityAnalysis';

interface VaultSecurityCategoryCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  count: number;
  description: string;
  emptyMessage: string;
  items: AnalyzedItem[];
  extraBadge?: (item: AnalyzedItem) => React.ReactNode;
  onEditItem: (item: VaultItem) => void;
}

export const VaultSecurityCategoryCard: React.FC<VaultSecurityCategoryCardProps> = ({
  icon,
  iconBgColor,
  title,
  count,
  description,
  emptyMessage,
  items,
  extraBadge,
  onEditItem,
}) => {
  return (
    <div className="bg-dark-card/40 border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${iconBgColor}`}>{icon}</div>
        <h3 className="text-lg font-semibold text-dark-text">
          {title} ({count})
        </h3>
      </div>
      <p className="text-xs text-dark-subtext mb-4">{description}</p>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="text-emerald-400 text-sm py-4 text-center bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onEditItem(item)}
              className="p-3 bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl cursor-pointer transition-colors group"
            >
              <div className="font-medium text-sm text-dark-text group-hover:text-brand-400 transition-colors flex items-center justify-between">
                <span>{item.label}</span>
                {item.login_type === 'google' && (
                  <span className="text-[10px] text-emerald-400 font-medium">SSO</span>
                )}
              </div>
              <div className="text-xs text-dark-subtext">
                {item.username || item.email || (item.login_type === 'google' ? 'Conta Google' : '')}
              </div>
              {extraBadge && extraBadge(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
